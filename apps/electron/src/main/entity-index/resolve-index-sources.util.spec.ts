import type { Workspace } from '@contracts';

import { describe, expect, it } from 'vitest';

import { resolveIndexSources } from './resolve-index-sources.util';

const workspace: Workspace = {
  includedMods: [
    { id: 'mod-1', name: 'alpha', path: '/mods/alpha', permission: 'editable' },
    { id: 'mod-2', name: 'beta', path: '/mods/beta', permission: 'readonly' },
  ],
};

describe('resolveIndexSources', () => {
  it('keeps each mod id, lowest → highest precedence', () => {
    expect(resolveIndexSources(workspace, null)).toEqual([
      { modId: 'mod-1', path: '/mods/alpha', permission: 'editable' },
      { modId: 'mod-2', path: '/mods/beta', permission: 'readonly' },
    ]);
  });

  it('prepends the vanilla game folder as a readonly source with no mod id', () => {
    expect(resolveIndexSources(workspace, '/games/hoi4')[0]).toEqual({
      modId: null,
      path: '/games/hoi4',
      permission: 'readonly',
    });
  });
});
