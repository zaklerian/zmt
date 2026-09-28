import * as v from 'valibot';

export const FILE_SUPPORT = {
  editable: 'editable',
  readonly: 'readonly',
  unsupported: 'unsupported',
} as const satisfies Record<string, string>;

export type FileSupport = (typeof FILE_SUPPORT)[keyof typeof FILE_SUPPORT];

export const FILE_SUPPORT_SCHEMA = v.picklist(Object.values(FILE_SUPPORT));

export const FS_NODE_TYPES = {
  directory: 'directory',
  file: 'file',
} as const satisfies Record<string, string>;

export type FsNodeType = (typeof FS_NODE_TYPES)[keyof typeof FS_NODE_TYPES];

export const FS_NODE_TYPE_SCHEMA = v.picklist(Object.values(FS_NODE_TYPES));

export const FS_NODE_SCHEMA = v.pipe(
  v.object({
    extension: v.nullable(v.string()),
    hasChildren: v.boolean(),
    name: v.string(),
    path: v.string(),
    support: FILE_SUPPORT_SCHEMA,
    type: FS_NODE_TYPE_SCHEMA,
  }),
  v.readonly(),
);

export type FsNode = v.InferOutput<typeof FS_NODE_SCHEMA>;

export const FS_NODE_LIST_SCHEMA = v.pipe(v.array(FS_NODE_SCHEMA), v.readonly());

export type FsNodeList = v.InferOutput<typeof FS_NODE_LIST_SCHEMA>;
