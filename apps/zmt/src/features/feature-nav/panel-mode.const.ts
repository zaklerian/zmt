export const PANEL_MODES = {
  file: 'file',
  nav: 'nav',
} as const satisfies Record<string, string>;

export type PanelMode = (typeof PANEL_MODES)[keyof typeof PANEL_MODES];
