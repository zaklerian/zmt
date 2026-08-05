import type { IncludedMod } from '@contracts';

import { ENTITY_REGISTRY } from '@e-game-hoi4';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  mods: [] as IncludedMod[],
  vanilla: null as null | string,
}));

vi.mock('../workspace', () => ({
  activeGameFolderPath: vi.fn(async () => state.vanilla),
  activeGameId: vi.fn(() => 'hoi4'),
  workspaceStoreService: { get: vi.fn(() => ({ includedMods: state.mods })) },
}));

vi.mock('../plugins', () => ({
  pluginRegistryService: {
    list: vi.fn(() => [{ parserExtension: { dialects: [] } }]),
  },
}));

const { entityIndexService } = await import('./entity-index.service');

const SPRITE_DIR = 'interface';

let roots: string[] = [];

// Writes a `.gfx` file whose `spriteTypes` block declares each name→texturefile.
async function gfxSource(
  id: string,
  permission: IncludedMod['permission'],
  fileName: string,
  sprites: Readonly<Record<string, string>>,
): Promise<IncludedMod> {
  const root = await mkdtemp(path.join(tmpdir(), 'zmt-sprite-'));
  roots.push(root);
  await mkdir(path.join(root, SPRITE_DIR), { recursive: true });
  const blocks = Object.entries(sprites)
    .map(
      ([name, texturefile]) =>
        `\tSpriteType = {\n\t\tname = "${name}"\n\t\ttexturefile = "${texturefile}"\n\t}`,
    )
    .join('\n');
  await writeFile(
    path.join(root, SPRITE_DIR, fileName),
    `spriteTypes = {\n${blocks}\n}\n`,
  );
  return { id, name: id, path: root, permission };
}

describe('entityIndexService — sprite (.gfx enumeration + stage-2 resolution)', () => {
  beforeEach(() => {
    roots = [];
    state.mods = [];
    state.vanilla = null;
    entityIndexService.clear();
  });

  afterEach(async () => {
    await Promise.all(
      roots.map((root) => rm(root, { force: true, recursive: true })),
    );
  });

  // Gate 4: `.gfx` files enumerate through the index (the `.gfx` extension the
  // registry declares), and the declared sprites come back with provenance. Gate 3
  // at the index level: same-name sprites across sources resolve last-wins.
  it('lists declared sprites across sources with last-wins provenance', async () => {
    const vanilla = await gfxSource('vanilla', 'readonly', 'base.gfx', {
      GFX_shared: 'gfx/interface/techtree/base.dds',
      GFX_vanilla_only: 'gfx/interface/v.dds',
    });
    const mod = await gfxSource('bice', 'editable', 'mod.gfx', {
      GFX_mod_only: 'gfx/interface/m.dds',
      GFX_shared: 'gfx/interface/techtree/mod.dds',
    });
    state.vanilla = vanilla.path;
    state.mods = [mod];

    const { entities, sources } = await entityIndexService.read(
      ENTITY_REGISTRY.sprite,
    );

    expect(entities.map((entity) => entity.id)).toEqual([
      'GFX_mod_only',
      'GFX_shared',
      'GFX_vanilla_only',
    ]);

    const shared = entities.find((entity) => entity.id === 'GFX_shared');
    expect(shared?.provenance.sourceId).toBe(mod.path);
    expect(shared?.provenance.reason).toBe('overriding-definition');
    expect(shared?.provenance.shadowedSourceIds).toEqual([vanilla.path]);
    // The winning definition's raw texturefile rides the entity, unresolved.
    expect(shared?.entity.texturefile).toBe('gfx/interface/techtree/mod.dds');

    const vanillaOnly = entities.find(
      (entity) => entity.id === 'GFX_vanilla_only',
    );
    expect(vanillaOnly?.provenance.sourceId).toBe(vanilla.path);
    expect(sources[vanilla.path]).toMatchObject({
      modId: null,
      permission: 'readonly',
    });
  });

  it('returns an empty list when no source declares any .gfx sprite', async () => {
    const mod = await mkdtemp(path.join(tmpdir(), 'zmt-sprite-'));
    roots.push(mod);
    state.mods = [
      { id: 'empty', name: 'empty', path: mod, permission: 'editable' },
    ];

    const { entities } = await entityIndexService.read(ENTITY_REGISTRY.sprite);
    expect(entities).toEqual([]);
  });
});
