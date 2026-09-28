export const VIEW_MODES = {
  code: 'code',
  table: 'table',
} as const satisfies Record<string, string>;

export type ViewMode = (typeof VIEW_MODES)[keyof typeof VIEW_MODES];

export const CONTENT_KINDS = {
  descriptor: 'descriptor',
  editor: 'editor',
  placeholder: 'placeholder',
} as const satisfies Record<string, string>;

export type ContentKind = (typeof CONTENT_KINDS)[keyof typeof CONTENT_KINDS];
