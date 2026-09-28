export const DEFAULT_FILE_CLASSIFICATION = {
  editable: {
    data: ['.yaml', '.yml', '.mod'],
    html: ['.htm', '.html'],
    text: ['.txt', '.md', '.info'],
  },
  readonly: {
    image: ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'],
  },
} as const satisfies {
  readonly editable: Readonly<Record<string, readonly string[]>>;
  readonly readonly: Readonly<Record<string, readonly string[]>>;
};
