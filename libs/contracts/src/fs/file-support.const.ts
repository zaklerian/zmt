export const FILE_SUPPORT = {
  editable: 'editable',
  readonly: 'readonly',
  unsupported: 'unsupported',
} as const satisfies Record<string, string>;

export type FileSupport = (typeof FILE_SUPPORT)[keyof typeof FILE_SUPPORT];
