import * as v from 'valibot';

import {
  FILE_SUPPORT,
  FILE_SUPPORT_SCHEMA,
  FS_NODE_LIST_SCHEMA,
  FS_NODE_SCHEMA,
  FS_NODE_TYPE_SCHEMA,
  FS_NODE_TYPES,
} from './fs-node.schema';

const DIRECTORY = {
  extension: null,
  hasChildren: true,
  name: 'common',
  path: '/root/common',
  support: FILE_SUPPORT.readonly,
  type: FS_NODE_TYPES.directory,
};

describe('FS_NODE_SCHEMA', () => {
  it('parses a directory node and a file node', () => {
    expect(v.parse(FS_NODE_SCHEMA, DIRECTORY)).toEqual(DIRECTORY);
    const file = { ...DIRECTORY, extension: '.txt', support: 'editable', type: 'file' };
    expect(v.parse(FS_NODE_SCHEMA, file)).toEqual(file);
  });

  it.each([
    [{ ...DIRECTORY, support: 'writable' }],
    [{ ...DIRECTORY, type: 'symlink' }],
    [{ ...DIRECTORY, extension: undefined }],
    [{ ...DIRECTORY, hasChildren: 'yes' }],
    [{ ...DIRECTORY, name: 1 }],
  ])('rejects %j', (value) => {
    expect(v.safeParse(FS_NODE_SCHEMA, value).success).toBe(false);
  });

  it('closes the support and type sets', () => {
    expect(v.safeParse(FILE_SUPPORT_SCHEMA, 'binary').success).toBe(false);
    expect(v.parse(FILE_SUPPORT_SCHEMA, 'unsupported')).toBe(FILE_SUPPORT.unsupported);
    expect(v.safeParse(FS_NODE_TYPE_SCHEMA, 'link').success).toBe(false);
    expect(v.parse(FS_NODE_TYPE_SCHEMA, 'file')).toBe(FS_NODE_TYPES.file);
  });

  it('parses a list and rejects a non-array', () => {
    expect(v.parse(FS_NODE_LIST_SCHEMA, [DIRECTORY])).toEqual([DIRECTORY]);
    expect(v.parse(FS_NODE_LIST_SCHEMA, [])).toEqual([]);
    expect(v.safeParse(FS_NODE_LIST_SCHEMA, DIRECTORY).success).toBe(false);
  });
});
