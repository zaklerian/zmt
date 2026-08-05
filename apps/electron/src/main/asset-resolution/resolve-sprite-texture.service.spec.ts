import type { IncludedMod } from '@contracts';

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

const { entityIndexService } = await import(
  '../entity-index/entity-index.service'
);
const { spriteTextureService } = await import(
  './resolve-sprite-texture.service'
);

const SPRITE_DIR = 'interface';

let roots: string[] = [];

async function makeRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'zmt-comp-'));
  roots.push(root);
  return root;
}

async function writeGfx(
  root: string,
  fileName: string,
  sprites: Readonly<Record<string, string>>,
): Promise<void> {
  await mkdir(path.join(root, SPRITE_DIR), { recursive: true });
  const blocks = Object.entries(sprites)
    .map(
      ([name, texturefile]) =>
        `\tSpriteType = {\n\t\tname = "${name}"\n\t\ttextureFile = "${texturefile}"\n\t}`,
    )
    .join('\n');
  await writeFile(
    path.join(root, SPRITE_DIR, fileName),
    `spriteTypes = {\n${blocks}\n}\n`,
  );
}

async function writeTexture(root: string, relativePath: string): Promise<void> {
  const absolute = path.join(root, relativePath);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, '');
}

describe('spriteTextureService — composition A→B', () => {
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

  // Gate 6: end-to-end, `GFX_air_techtree_bg` — declared in the editable mod,
  // texture absent from the mod — resolves to the actual vanilla file. The two
  // provenances differ: the sprite is DECLARED by the mod, the texture is PROVIDED
  // by the readonly vanilla reference. This is the one mechanism the geometry
  // background and (later) tech icons both call.
  it('resolves a mod-declared sprite whose texture falls back to vanilla', async () => {
    const vanilla = await makeRoot();
    await writeTexture(vanilla, 'gfx/interface/techtree/air_techtree_bg.dds');
    const mod = await makeRoot();
    await writeGfx(mod, 'countrytechnologyview.gfx', {
      GFX_air_techtree_bg: 'gfx//interface//techtree//air_techtree_bg.dds',
    });
    state.vanilla = vanilla;
    state.mods = [
      { id: 'bice', name: 'bice', path: mod, permission: 'editable' },
    ];

    const result = await spriteTextureService.resolve('GFX_air_techtree_bg');

    expect(result.sprite?.id).toBe('GFX_air_techtree_bg');
    expect(result.sprite?.provenance.sourceId).toBe(mod);
    expect(result.asset.status).toBe('resolved');
    if (result.asset.status !== 'resolved') return;
    expect(result.asset.provenance.sourceId).toBe(vanilla);
    expect(result.asset.provenance.permission).toBe('readonly');
    expect(result.asset.provenance.absolutePath).toBe(
      path.join(vanilla, 'gfx/interface/techtree/air_techtree_bg.dds'),
    );
  });

  // A sprite the mod both declares and ships resolves entirely within the mod.
  it('resolves a mod-declared sprite whose texture the mod also provides', async () => {
    const mod = await makeRoot();
    await writeGfx(mod, 'Technologies.gfx', {
      GFX_fuel_medium: 'gfx/interface/technologies/fuel_medium.dds',
    });
    await writeTexture(mod, 'gfx/interface/technologies/fuel_medium.dds');
    state.mods = [
      { id: 'bice', name: 'bice', path: mod, permission: 'editable' },
    ];

    const result = await spriteTextureService.resolve('GFX_fuel_medium');

    expect(result.asset.status).toBe('resolved');
    if (result.asset.status !== 'resolved') return;
    expect(result.asset.provenance.sourceId).toBe(mod);
    expect(result.asset.provenance.permission).toBe('editable');
  });

  // A known sprite whose texture no source provides: the sprite comes back, the
  // asset is a clean unresolved — a missing texture is not an error.
  it('returns the sprite with an unresolved asset when the texture is missing', async () => {
    const mod = await makeRoot();
    await writeGfx(mod, 'Technologies.gfx', {
      GFX_ghost: 'gfx/interface/technologies/ghost.dds',
    });
    state.mods = [
      { id: 'bice', name: 'bice', path: mod, permission: 'editable' },
    ];

    const result = await spriteTextureService.resolve('GFX_ghost');

    expect(result.sprite?.id).toBe('GFX_ghost');
    expect(result.asset.status).toBe('unresolved');
  });

  // An unknown sprite name: null sprite, unresolved asset — no throw.
  it('returns null sprite and unresolved asset for an unknown sprite name', async () => {
    const mod = await makeRoot();
    await writeGfx(mod, 'Technologies.gfx', {
      GFX_known: 'gfx/interface/technologies/known.dds',
    });
    state.mods = [
      { id: 'bice', name: 'bice', path: mod, permission: 'editable' },
    ];

    const result = await spriteTextureService.resolve('GFX_missing');

    expect(result.sprite).toBeNull();
    expect(result.asset.status).toBe('unresolved');
  });
});
