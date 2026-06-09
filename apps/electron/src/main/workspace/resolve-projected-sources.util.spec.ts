import { Workspace } from '@contracts';
import { describe, expect, it } from 'vitest';

import { resolveProjectedSources } from './resolve-projected-sources.util';

const workspace: Workspace = {
  openMods: [
    { id: 'mod-1', name: 'alpha', path: '/mods/alpha', permission: 'editable' },
    { id: 'mod-2', name: 'beta', path: '/mods/beta', permission: 'editable' },
  ],
};

describe('resolveProjectedSources', () => {
  it('returns mods only when the game folder path is empty', () => {
    expect(resolveProjectedSources('hoi4', workspace, '')).toEqual([
      { path: '/mods/alpha', permission: 'editable' },
      { path: '/mods/beta', permission: 'editable' },
    ]);
  });

  it('returns mods only when the game folder path is null', () => {
    expect(resolveProjectedSources('hoi4', workspace, null)).toEqual([
      { path: '/mods/alpha', permission: 'editable' },
      { path: '/mods/beta', permission: 'editable' },
    ]);
  });

  it('prepends a readonly vanilla source when a game folder path is set', () => {
    const sources = resolveProjectedSources('hoi4', workspace, '/games/hoi4');
    expect(sources[0]).toEqual({ path: '/games/hoi4', permission: 'readonly' });
    expect(sources).toHaveLength(3);
  });

  it('orders the vanilla source ahead of every mod', () => {
    const sources = resolveProjectedSources('hoi4', workspace, '/games/hoi4');
    expect(sources.map((source) => source.path)).toEqual([
      '/games/hoi4',
      '/mods/alpha',
      '/mods/beta',
    ]);
  });
});
