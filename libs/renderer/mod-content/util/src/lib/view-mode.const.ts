export const VIEW_MODES = {
  code: 'code',
  table: 'table',
} as const satisfies Record<string, string>;

export type ViewMode = (typeof VIEW_MODES)[keyof typeof VIEW_MODES];

export const STRUCTURED_VIEWS = {
  form: 'form',
  table: 'table',
} as const satisfies Record<string, string>;

export type StructuredView = (typeof STRUCTURED_VIEWS)[keyof typeof STRUCTURED_VIEWS];

export const CONTENT_KINDS = {
  descriptor: 'descriptor',
  editor: 'editor',
  entityTable: 'entityTable',
  placeholder: 'placeholder',
} as const satisfies Record<string, string>;

export type ContentKind = (typeof CONTENT_KINDS)[keyof typeof CONTENT_KINDS];
