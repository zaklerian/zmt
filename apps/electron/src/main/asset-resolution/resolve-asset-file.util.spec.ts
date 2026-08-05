import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import type { IndexSource } from '../entity-index/entity-index.model';

import { resolveAssetFile } from './resolve-asset-file.util';

let roots: string[] = [];

// Creates a source root on disk carrying the given texture files (each an empty
// placeholder — resolution B resolves the PATH, never the bytes; a `.dds` decode
// is the next ticket). Returns the `IndexSource` the resolver consumes.
async function source(
  id: null | string,
  permission: IndexSource['permission'],
  files: readonly string[],
): Promise<IndexSource> {
  const root = await mkdtemp(path.join(tmpdir(), 'zmt-asset-'));
  roots.push(root);
  for (const relativePath of files) {
    const absolute = path.join(root, relativePath);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, '');
  }
  return { modId: id, path: root, permission };
}

describe('resolveAssetFile', () => {
  afterEach(async () => {
    await Promise.all(
      roots.map((root) => rm(root, { force: true, recursive: true })),
    );
    roots = [];
  });

  // Gate 5 — vanilla fallback: the texture is absent from the editable mod and
  // present only in the readonly vanilla reference, so it resolves to vanilla with
  // readonly provenance and a null modId. This is the case the prompt names for
  // `air_techtree_bg.dds`.
  it('resolves to the readonly vanilla reference when the mod lacks the texture', async () => {
    const vanilla = await source(null, 'readonly', [
      'gfx/interface/techtree/air_techtree_bg.dds',
    ]);
    const mod = await source('bice', 'editable', [
      'gfx/interface/techtree/engineering_techtree_bg.dds',
    ]);

    const result = await resolveAssetFile(
      [vanilla, mod],
      'gfx//interface//techtree//air_techtree_bg.dds',
    );

    expect(result.status).toBe('resolved');
    if (result.status !== 'resolved') return;
    expect(result.provenance.sourceId).toBe(vanilla.path);
    expect(result.provenance.modId).toBeNull();
    expect(result.provenance.permission).toBe('readonly');
    expect(result.provenance.reason).toBe('sole-provider');
    expect(result.provenance.absolutePath).toBe(
      path.join(vanilla.path, 'gfx/interface/techtree/air_techtree_bg.dds'),
    );
  });

  // Gate 5 — BICE-present: a texture the editable mod provides resolves to the mod,
  // overriding a same-path vanilla copy (last-wins), with editable provenance so a
  // later write lands in the mod, never the readonly reference.
  it('resolves to the editable mod and shadows vanilla when both provide it', async () => {
    const vanilla = await source(null, 'readonly', [
      'gfx/interface/techtree/engineering_techtree_bg.dds',
    ]);
    const mod = await source('bice', 'editable', [
      'gfx/interface/techtree/engineering_techtree_bg.dds',
    ]);

    const result = await resolveAssetFile(
      [vanilla, mod],
      'gfx/interface/techtree/engineering_techtree_bg.dds',
    );

    expect(result.status).toBe('resolved');
    if (result.status !== 'resolved') return;
    expect(result.provenance.sourceId).toBe(mod.path);
    expect(result.provenance.permission).toBe('editable');
    expect(result.provenance.reason).toBe('last-wins');
    expect(result.provenance.shadowedSourceIds).toEqual([vanilla.path]);
  });

  // Gate 5 — missing asset: a reference no source provides returns a clean
  // `unresolved`, never an error. The requested path rides back for diagnostics.
  it('returns a clean unresolved for a texture no source provides', async () => {
    const mod = await source('bice', 'editable', ['gfx/interface/other.dds']);

    const result = await resolveAssetFile(
      [mod],
      'gfx/interface/techtree/air_techtree_bg.dds',
    );

    expect(result).toEqual({
      requestedPath: 'gfx/interface/techtree/air_techtree_bg.dds',
      status: 'unresolved',
    });
  });

  // Gate 5 — extension mismatch: the `.gfx` references `.tga` while the source
  // ships `.dds` (the survey's documented messiness). The probe matches the
  // family and resolves to the actual on-disk `.dds`.
  it('resolves a .tga reference to a .dds that ships in its place', async () => {
    const mod = await source('bice', 'editable', [
      'gfx/interface/sort_button_83x29.dds',
    ]);

    const result = await resolveAssetFile(
      [mod],
      'gfx//interface//sort_button_83x29.tga',
    );

    expect(result.status).toBe('resolved');
    if (result.status !== 'resolved') return;
    expect(result.provenance.relativePath).toBe(
      'gfx/interface/sort_button_83x29.dds',
    );
    expect(result.provenance.reason).toBe('sole-provider');
  });

  // The on-disk match is case-insensitive: a lowercased reference resolves to a
  // mixed-case file, so a `.gfx` authored with different casing still finds its
  // texture.
  it('matches the on-disk file case-insensitively', async () => {
    const mod = await source('bice', 'editable', [
      'gfx/interface/Techtree/Air_TechTree_BG.dds',
    ]);

    const result = await resolveAssetFile(
      [mod],
      'gfx/interface/Techtree/air_techtree_bg.dds',
    );

    expect(result.status).toBe('resolved');
    if (result.status !== 'resolved') return;
    expect(result.provenance.relativePath).toBe(
      'gfx/interface/Techtree/Air_TechTree_BG.dds',
    );
  });

  // An unrelated file with the same stem but a foreign extension does NOT satisfy
  // the reference — only the `.dds`/`.tga` family is interchangeable.
  it('does not match a foreign extension with the same stem', async () => {
    const mod = await source('bice', 'editable', ['gfx/interface/logo.png']);

    const result = await resolveAssetFile([mod], 'gfx/interface/logo.dds');

    expect(result.status).toBe('unresolved');
  });
});
