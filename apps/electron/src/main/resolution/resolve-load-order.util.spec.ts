import { describe, expect, it } from 'vitest';

import { ResolutionSource } from './resolution.model';
import { resolveLoadOrder } from './resolve-load-order.util';

const source = (
  root: string,
  files: readonly string[],
  replacePaths: readonly string[] = [],
): ResolutionSource => ({ files, replacePaths, root });

describe('resolveLoadOrder', () => {
  // (a) sole-provider
  it('marks a single source providing a single file as sole-provider', () => {
    const vanilla = source('/game', ['common/file.txt']);

    const resolved = resolveLoadOrder([vanilla]);

    expect(resolved).toHaveLength(1);
    expect(resolved[0]).toEqual({
      absolutePath: '/game/common/file.txt',
      reason: 'sole-provider',
      relativePath: 'common/file.txt',
      shadowedSources: [],
      winningSource: vanilla,
    });
  });

  // (b) last-wins basic
  it('resolves a contested path to the highest-precedence source', () => {
    const vanilla = source('/game', ['common/file.txt']);
    const mod = source('/mods/mod', ['common/file.txt']);

    const [resolved] = resolveLoadOrder([vanilla, mod]);

    expect(resolved.winningSource).toBe(mod);
    expect(resolved.shadowedSources).toEqual([vanilla]);
    expect(resolved.reason).toBe('last-wins');
    expect(resolved.absolutePath).toBe('/mods/mod/common/file.txt');
  });

  // (c) three sources, same path — shadowed in precedence order
  it('shadows lower sources in precedence order for a triple-contested path', () => {
    const vanilla = source('/game', ['common/file.txt']);
    const modA = source('/mods/a', ['common/file.txt']);
    const modB = source('/mods/b', ['common/file.txt']);

    const [resolved] = resolveLoadOrder([vanilla, modA, modB]);

    expect(resolved.winningSource).toBe(modB);
    expect(resolved.shadowedSources).toEqual([vanilla, modA]);
    expect(resolved.reason).toBe('last-wins');
  });

  // (d) non-overlapping files are each sole-provider
  it('keeps every unique file as its own sole-provider', () => {
    const vanilla = source('/game', ['common/a.txt']);
    const mod = source('/mods/mod', ['common/b.txt']);

    const resolved = resolveLoadOrder([vanilla, mod]);

    expect(resolved).toEqual([
      {
        absolutePath: '/game/common/a.txt',
        reason: 'sole-provider',
        relativePath: 'common/a.txt',
        shadowedSources: [],
        winningSource: vanilla,
      },
      {
        absolutePath: '/mods/mod/common/b.txt',
        reason: 'sole-provider',
        relativePath: 'common/b.txt',
        shadowedSources: [],
        winningSource: mod,
      },
    ]);
  });

  // (e) replace_path basic — lower files in the folder vanish unless re-provided
  it('discards lower-source files in a replaced folder that are not re-provided', () => {
    const vanilla = source('/game', ['units/x.txt', 'units/y.txt']);
    const modB = source('/mods/b', ['units/x.txt'], ['units']);

    const resolved = resolveLoadOrder([vanilla, modB]);

    expect(resolved.map((file) => file.relativePath)).toEqual(['units/x.txt']);

    const [resolvedX] = resolved;
    expect(resolvedX.winningSource).toBe(modB);
    expect(resolvedX.shadowedSources).toEqual([]);
    expect(resolvedX.reason).toBe('replace-path');
    expect(resolvedX.absolutePath).toBe('/mods/b/units/x.txt');

    // vanilla's units/y.txt was discarded by the replacement, never re-provided.
    expect(
      resolved.find((file) => file.relativePath === 'units/y.txt'),
    ).toBeUndefined();
  });

  // (f) replace_path then a higher non-replacing source re-provides the path.
  // The folder set is replacement-determined, so a file present because a source
  // at or below the winner replaced its folder gets 'replace-path' even when the
  // top winner did not itself replace the folder. vanilla was removed from
  // contention by modB's replacement, so it is NOT a shadowedSource of modC.
  it('treats a re-provided file in a replaced folder as replace-path, dropping the discarded lower source', () => {
    const vanilla = source('/game', ['units/x.txt']);
    const modB = source('/mods/b', ['units/x.txt'], ['units']);
    const modC = source('/mods/c', ['units/x.txt']);

    const [resolved] = resolveLoadOrder([vanilla, modB, modC]);

    expect(resolved.winningSource).toBe(modC);
    expect(resolved.shadowedSources).toEqual([modB]);
    expect(resolved.shadowedSources).not.toContain(vanilla);
    expect(resolved.reason).toBe('replace-path');
    expect(resolved.absolutePath).toBe('/mods/c/units/x.txt');
  });

  // (g) two sources replace_path the same folder — co-replacers compete by last-wins
  it('lets co-replacers of a folder compete by last-wins', () => {
    const modB = source('/mods/b', ['units/x.txt'], ['units']);
    const modC = source('/mods/c', ['units/x.txt'], ['units']);

    const [resolved] = resolveLoadOrder([modB, modC]);

    expect(resolved.winningSource).toBe(modC);
    expect(resolved.shadowedSources).toEqual([modB]);
    expect(resolved.reason).toBe('replace-path');
  });

  // (h) replace_path on a folder with no re-provided files — folder empties out
  it('empties a replaced folder when the replacing source provides nothing under it', () => {
    const vanilla = source('/game', ['units/a.txt', 'units/b.txt']);
    const modB = source('/mods/b', [], ['units']);

    const resolved = resolveLoadOrder([vanilla, modB]);

    expect(resolved).toEqual([]);
  });

  // (i) segment-boundary prefix matching — 'units' must not match 'units_extra/...'
  it('matches replace_path on a path-segment boundary, not a raw string prefix', () => {
    const vanilla = source('/game', ['units_extra/file.txt']);
    const modB = source('/mods/b', [], ['units']);

    const resolved = resolveLoadOrder([vanilla, modB]);

    expect(resolved).toHaveLength(1);
    expect(resolved[0].relativePath).toBe('units_extra/file.txt');
    expect(resolved[0].winningSource).toBe(vanilla);
    expect(resolved[0].reason).toBe('sole-provider');
  });

  // (j) determinism — output sorted by relativePath regardless of input order
  it('sorts output by relativePath regardless of input source or file order', () => {
    const vanilla = source('/game', ['z.txt', 'a.txt']);
    const mod = source('/mods/mod', ['m.txt', 'b.txt']);

    const resolved = resolveLoadOrder([mod, vanilla]);

    expect(resolved.map((file) => file.relativePath)).toEqual([
      'a.txt',
      'b.txt',
      'm.txt',
      'z.txt',
    ]);
  });
});
