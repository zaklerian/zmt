import type { FsNode } from '@zmt/contracts';

import { basename, toFileTreeItems } from './file-tree-item.util';

const COMMON: FsNode = {
  extension: null,
  hasChildren: true,
  name: 'common',
  path: '/mod/common',
  support: 'unsupported',
  type: 'directory',
};

const EMPTY_DIR: FsNode = { ...COMMON, hasChildren: false, name: 'gfx', path: '/mod/gfx' };

const DESCRIPTOR: FsNode = {
  extension: '.mod',
  hasChildren: false,
  name: 'descriptor.mod',
  path: '/mod/descriptor.mod',
  support: 'editable',
  type: 'file',
};

const TECH: FsNode = {
  extension: '.txt',
  hasChildren: false,
  name: 'air.txt',
  path: '/mod/common/air.txt',
  support: 'editable',
  type: 'file',
};

describe('toFileTreeItems', () => {
  it('returns no items without a root', () => {
    expect(toFileTreeItems(null, {})).toEqual([]);
  });

  it('renders an unloaded root as expandable with null children', () => {
    expect(toFileTreeItems('/mod', {})).toEqual([
      { children: null, expandable: true, id: '/mod', label: 'mod', node: null },
    ]);
  });

  it('nests loaded children and marks unloaded directories with null children', () => {
    const [root] = toFileTreeItems('/mod', {
      '/mod': [COMMON, EMPTY_DIR, DESCRIPTOR],
      '/mod/common': [TECH],
    });
    expect(root?.children?.map((item) => item.id)).toEqual([
      '/mod/common',
      '/mod/gfx',
      '/mod/descriptor.mod',
    ]);
    const [common, gfx, descriptor] = root?.children ?? [];
    expect(common).toMatchObject({ expandable: true, label: 'common', node: COMMON });
    expect(common?.children).toEqual([
      { children: null, expandable: false, id: TECH.path, label: 'air.txt', node: TECH },
    ]);
    expect(gfx).toMatchObject({ children: null, expandable: false });
    expect(descriptor).toMatchObject({ children: null, expandable: false, node: DESCRIPTOR });
  });
});

describe('basename', () => {
  it('takes the last non-empty segment of either separator style', () => {
    expect(basename('/mods/my-mod')).toBe('my-mod');
    expect(basename('C:\\mods\\other\\')).toBe('other');
    expect(basename('')).toBe('');
  });
});
