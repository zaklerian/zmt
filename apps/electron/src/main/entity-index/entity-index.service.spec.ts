import type { IncludedMod } from '@contracts';

import { mkdir, mkdtemp, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ mods: [] as IncludedMod[] }));

vi.mock('../workspace', () => ({
  activeGameFolderPath: vi.fn(async () => null),
  activeGameId: vi.fn(() => 'hoi4'),
  workspaceStoreService: { get: vi.fn(() => ({ includedMods: state.mods })) },
}));

vi.mock('../plugins', () => ({
  pluginRegistryService: {
    list: vi.fn(() => [{ parserExtension: { dialects: [] } }]),
  },
}));

const { entityIndexService } = await import('./entity-index.service');

const MODULE_DIR = 'common/units/equipment/modules';

let roots: string[] = [];

async function mod(
  id: string,
  permission: IncludedMod['permission'],
  files: Readonly<Record<string, Readonly<Record<string, string>>>>,
): Promise<IncludedMod> {
  const root = await mkdtemp(path.join(tmpdir(), 'zmt-svc-'));
  roots.push(root);
  await mkdir(path.join(root, MODULE_DIR), { recursive: true });
  for (const [fileName, entries] of Object.entries(files)) {
    await writeFile(
      path.join(root, MODULE_DIR, fileName),
      modulesFile(entries),
    );
  }
  return { id, name: id, path: root, permission };
}

function modulesFile(entries: Readonly<Record<string, string>>): string {
  const body = Object.entries(entries)
    .map(([name, category]) => `\t${name} = {\n\t\tcategory = ${category}\n\t}`)
    .join('\n');
  return `equipment_modules = {\n${body}\n}\n`;
}

function named(catalog: readonly { readonly name: string }[]): string[] {
  return catalog.map((entry) => entry.name).sort();
}

describe('entityIndexService', () => {
  beforeEach(() => {
    roots = [];
    state.mods = [];
    entityIndexService.clear();
  });

  afterEach(async () => {
    await Promise.all(
      roots.map((root) => rm(root, { force: true, recursive: true })),
    );
  });

  // Gate 3: module-list equivalence with the retired catalog-modules for a
  // source set with no replace_path on the module dir. Distinct file names per
  // source (the realistic mod layout) make stage-1 file resolution a no-op, so
  // the index reduces to catalog-modules' source-precedence-major name dedup —
  // reproducing the exact outcomes the deleted catalog-modules spec asserted.
  describe('moduleCatalog equivalence with catalog-modules (no replace_path)', () => {
    it('aggregates non-colliding modules from every source with the winning source', async () => {
      const vanilla = await mod('vanilla', 'readonly', {
        '00_vanilla.txt': { engine_small_1: 'engine' },
      });
      const editable = await mod('mod', 'editable', {
        '00_mod.txt': { ship_gun_1: 'ship_light_battery' },
      });
      state.mods = [vanilla, editable];

      const catalog = await entityIndexService.moduleCatalog();

      expect(named(catalog)).toEqual(['engine_small_1', 'ship_gun_1']);
      expect(catalog.find((e) => e.name === 'engine_small_1')).toMatchObject({
        category: 'engine',
        source: vanilla.path,
      });
      expect(catalog.find((e) => e.name === 'ship_gun_1')?.source).toBe(
        editable.path,
      );
    });

    it('dedups a name collision to the higher-precedence source', async () => {
      const vanilla = await mod('vanilla', 'readonly', {
        '00_vanilla.txt': { shared_engine: 'engine' },
      });
      const editable = await mod('mod', 'editable', {
        '00_mod.txt': { shared_engine: 'armament_type' },
      });
      state.mods = [vanilla, editable];

      const catalog = await entityIndexService.moduleCatalog();

      expect(catalog.filter((e) => e.name === 'shared_engine')).toHaveLength(1);
      expect(catalog.find((e) => e.name === 'shared_engine')).toMatchObject({
        category: 'armament_type',
        source: editable.path,
      });
    });

    it('overrides a vanilla module while keeping vanilla-only and mod-only entries', async () => {
      const vanilla = await mod('vanilla', 'readonly', {
        '00_vanilla.txt': { shared: 'engine', vanilla_only: 'engine' },
      });
      const editable = await mod('mod', 'editable', {
        '00_mod.txt': {
          mod_only: 'ship_light_battery',
          shared: 'armament_type',
        },
      });
      state.mods = [vanilla, editable];

      const catalog = await entityIndexService.moduleCatalog();

      expect(named(catalog)).toEqual(['mod_only', 'shared', 'vanilla_only']);
      expect(catalog.find((e) => e.name === 'shared')?.source).toBe(
        editable.path,
      );
      expect(catalog.find((e) => e.name === 'vanilla_only')?.source).toBe(
        vanilla.path,
      );
    });
  });

  // The divergence the ZMT-30 amendment predicts (recorded as a correctness fix,
  // not a regression): when two sources share a file NAME, stage-1 file
  // resolution replaces the lower source's file wholesale (the engine's
  // same-named-file replacement), so its unique entries are dropped —
  // catalog-modules, doing entity dedup without file resolution, would have kept
  // them.
  it("drops a lower source's unique modules when a higher source shares the file name", async () => {
    const vanilla = await mod('vanilla', 'readonly', {
      '00_modules.txt': { shared: 'engine', vanilla_only: 'engine' },
    });
    const editable = await mod('mod', 'editable', {
      '00_modules.txt': { mod_only: 'ship', shared: 'armament_type' },
    });
    state.mods = [vanilla, editable];

    const catalog = await entityIndexService.moduleCatalog();

    expect(named(catalog)).toEqual(['mod_only', 'shared']);
  });

  // Gate 5: cache correctness.
  describe('cache invalidation', () => {
    it('rebuilds when a contributing file mtime changes', async () => {
      const filePath = path.join(MODULE_DIR, '00_mod.txt');
      const editable = await mod('mod', 'editable', {
        '00_mod.txt': { engine_a: 'engine' },
      });
      state.mods = [editable];

      expect(named(await entityIndexService.moduleCatalog())).toEqual([
        'engine_a',
      ]);

      const absolute = path.join(editable.path, filePath);
      await writeFile(absolute, modulesFile({ engine_b: 'engine' }));
      const now = await stat(absolute);
      // Bump the mtime forward unambiguously so the stat check sees the edit.
      await utimes(absolute, now.atime, new Date(now.mtimeMs + 2000));

      expect(named(await entityIndexService.moduleCatalog())).toEqual([
        'engine_b',
      ]);
    });

    it('an explicit invalidation catches a same-tick write the mtime check would miss', async () => {
      const relativePath = `${MODULE_DIR}/00_mod.txt`;
      const editable = await mod('mod', 'editable', {
        '00_mod.txt': { engine_a: 'engine' },
      });
      state.mods = [editable];

      // Pin a whole-millisecond mtime so it can be restored EXACTLY, simulating a
      // coarse-granularity filesystem that reports an unchanged mtime for a write
      // landing within the same tick as the cached build.
      const absolute = path.join(editable.path, relativePath);
      const tick = new Date(1_700_000_000_000);
      await utimes(absolute, tick, tick);

      expect(named(await entityIndexService.moduleCatalog())).toEqual([
        'engine_a',
      ]);

      await writeFile(absolute, modulesFile({ engine_b: 'engine' }));
      await utimes(absolute, tick, tick);
      // The stat check alone cannot see the same-tick edit — it serves stale data.
      expect(named(await entityIndexService.moduleCatalog())).toEqual([
        'engine_a',
      ]);

      // ...so the write path invalidates explicitly, and the next read rebuilds.
      entityIndexService.invalidateForRelativePath(relativePath);
      expect(named(await entityIndexService.moduleCatalog())).toEqual([
        'engine_b',
      ]);
    });
  });
});
