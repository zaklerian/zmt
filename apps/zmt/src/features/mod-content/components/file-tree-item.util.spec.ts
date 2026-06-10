import { describe, expect, it } from 'vitest';

import { mergeNewRoots } from './file-tree-item.util';

describe('mergeNewRoots', () => {
  it('appends a newly appeared root to the prior expansion', () => {
    expect(mergeNewRoots(['/mods/a'], ['/mods/b'])).toEqual([
      '/mods/a',
      '/mods/b',
    ]);
  });

  it('seeds the first root into an empty expansion', () => {
    expect(mergeNewRoots([], ['/mods/a'])).toEqual(['/mods/a']);
  });

  it('does not duplicate a root already present in the prior expansion', () => {
    expect(mergeNewRoots(['/mods/a', '/mods/a/sub'], ['/mods/a'])).toEqual([
      '/mods/a',
      '/mods/a/sub',
    ]);
  });

  it('preserves prior expansion when there are no new roots', () => {
    expect(mergeNewRoots(['/mods/a/sub'], [])).toEqual(['/mods/a/sub']);
  });
});
