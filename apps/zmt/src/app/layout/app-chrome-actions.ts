import { Action } from '@r-core';

// Add/open a mod folder — one action hosted on two surfaces (app-header and
// no-folder-state, ADR 015). Each host supplies its own slice: `present` drives
// availability (header: only when a source is already loaded; empty state:
// always), `hasSource` selects the label, `openFolder` is the shared handler.
export interface AddModActionContext {
  hasSource: boolean;
  openFolder: () => Promise<void> | void;
  present: boolean;
}

export interface DrawerToggleActionContext {
  open: boolean;
  toggle: () => void;
}

export interface OpenSettingsActionContext {
  openSettings: () => void;
}

export const appChromeActions: {
  readonly addMod: Action<AddModActionContext>;
  readonly drawerToggle: Action<DrawerToggleActionContext>;
  readonly openSettings: Action<OpenSettingsActionContext>;
} = {
  addMod: {
    execute: (context) => context.openFolder(),
    id: 'app-add-mod',
    isAvailable: (context) => context.present,
    label: (context) =>
      context.hasSource ? 'app:actions.addMod' : 'app:actions.openModFolder',
  },

  drawerToggle: {
    execute: (context) => context.toggle(),
    id: 'app-drawer-toggle',
    isAvailable: () => true,
    label: (context) =>
      context.open ? 'app:layout.drawer.collapse' : 'app:layout.drawer.expand',
  },

  openSettings: {
    execute: (context) => context.openSettings(),
    id: 'app-open-settings',
    isAvailable: () => true,
    label: () => 'app:header.appSettings.label',
  },
};
