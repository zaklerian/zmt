import { DESCRIPTOR_FILENAME } from '@contracts';
import { ENTITY_REGISTRY } from '@e-game-hoi4';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type {
  EntityIndexResult,
  IndexedEntity,
  IndexSource,
} from './entity-index.model';

import { buildEntityIndex } from './build-entity-index.util';

const MODULE_DIR = 'common/units/equipment/modules';

let roots: string[] = [];

async function index(sources: readonly IndexSource[]) {
  return buildEntityIndex(sources, ENTITY_REGISTRY.module, []);
}

// Renders an `equipment_modules` block; each entry is `name → category`.
function modulesFile(entries: Readonly<Record<string, string>>): string {
  const body = Object.entries(entries)
    .map(([name, category]) => `\t${name} = {\n\t\tcategory = ${category}\n\t}`)
    .join('\n');
  return `equipment_modules = {\n${body}\n}\n`;
}

// A projected source on disk: writes each named module file, and an optional
// `descriptor.mod` carrying `replace_path` declarations.
async function source(
  permission: IndexSource['permission'],
  modId: IndexSource['modId'],
  files: Readonly<Record<string, Readonly<Record<string, string>>>>,
  replacePaths: readonly string[] = [],
): Promise<IndexSource> {
  const root = await mkdtemp(path.join(tmpdir(), 'zmt-index-'));
  roots.push(root);
  await mkdir(path.join(root, MODULE_DIR), { recursive: true });
  for (const [fileName, entries] of Object.entries(files)) {
    await writeFile(
      path.join(root, MODULE_DIR, fileName),
      modulesFile(entries),
    );
  }
  if (replacePaths.length > 0) {
    await writeFile(
      path.join(root, DESCRIPTOR_FILENAME),
      replacePaths.map((folder) => `replace_path="${folder}"`).join('\n'),
    );
  }
  return { modId, path: root, permission };
}

function survivor<T>(
  result: EntityIndexResult<T>,
  id: string,
): IndexedEntity<T> {
  const found = result.entities.find((entity) => entity.id === id);
  if (found === undefined) throw new Error(`No indexed entity: ${id}`);
  return found;
}

describe('buildEntityIndex (two-stage resolution)', () => {
  beforeEach(() => {
    roots = [];
  });

  afterEach(async () => {
    await Promise.all(
      roots.map((root) => rm(root, { force: true, recursive: true })),
    );
  });

  it('shadows a same-name entity in a differently-named, lower-precedence file by the higher-precedence definition', async () => {
    // The case file-level-only resolution misses: two DIFFERENT file names, each
    // its own path-winner, so stage 1 keeps both — only stage-2 entity resolution
    // collapses the same-name pair. The lower-precedence file is named
    // alphabetically LATER (zzz_ vs aaa_) to prove precedence, not filename,
    // decides: the mod (higher precedence) must win despite the earlier name.
    const vanilla = await source('readonly', null, {
      'zzz_vanilla.txt': { only_vanilla: 'engine', shared: 'vanilla_engine' },
    });
    const mod = await source('editable', 'mod-a', {
      'aaa_mod.txt': { only_mod: 'ship', shared: 'mod_engine' },
    });

    const result = await index([vanilla, mod]);

    const shared = survivor(result, 'shared');
    expect(shared.entity.category).toBe('mod_engine');
    expect(shared.provenance.sourceId).toBe(mod.path);
    expect(shared.provenance.shadowedSourceIds).toEqual([vanilla.path]);
    expect(shared.provenance.reason).toBe('overriding-definition');

    expect(survivor(result, 'only_vanilla').provenance).toMatchObject({
      reason: 'sole-definition',
      shadowedSourceIds: [],
      sourceId: vanilla.path,
    });
    expect(survivor(result, 'only_mod').provenance.sourceId).toBe(mod.path);
    expect(result.entities).toHaveLength(3);
  });

  it('drops contributions replaced away by a higher-precedence replace_path on the folder', async () => {
    const vanilla = await source('readonly', null, {
      '00_vanilla.txt': { vanilla_only: 'engine' },
    });
    const mod = await source(
      'editable',
      'mod-a',
      { '00_mod.txt': { mod_only: 'ship' } },
      [MODULE_DIR],
    );

    const result = await index([vanilla, mod]);

    expect(result.entities.map((entity) => entity.id)).toEqual(['mod_only']);
    expect(survivor(result, 'mod_only').provenance.reason).toBe(
      'sole-definition',
    );
    // The dropped vanilla source contributes no surviving file, so it is absent
    // from the normalized sources table.
    expect(result.sources).toEqual({
      [mod.path]: { modId: 'mod-a', path: mod.path, permission: 'editable' },
    });
  });

  it('normalizes provenance: entities carry source ids, the sources table carries detail', async () => {
    const vanilla = await source('readonly', null, {
      '00_vanilla.txt': { engine_small: 'engine' },
    });
    const mod = await source('editable', 'mod-a', {
      '00_mod.txt': { ship_gun: 'ship' },
    });

    const result = await index([vanilla, mod]);

    expect(result.sources).toEqual({
      [mod.path]: { modId: 'mod-a', path: mod.path, permission: 'editable' },
      [vanilla.path]: {
        modId: null,
        path: vanilla.path,
        permission: 'readonly',
      },
    });
    for (const entity of result.entities) {
      expect(result.sources[entity.provenance.sourceId]).toBeDefined();
    }
  });
});
