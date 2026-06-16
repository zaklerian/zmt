import { describe, expect, it, vi } from 'vitest';

import { appChromeActions } from './app-chrome-actions';

describe('appChromeActions.addMod', () => {
  it('drives presence from the surface-supplied slice', () => {
    expect(
      appChromeActions.addMod.isAvailable({
        hasSource: true,
        openFolder: vi.fn(),
        present: true,
      }),
    ).toBe(true);
    expect(
      appChromeActions.addMod.isAvailable({
        hasSource: false,
        openFolder: vi.fn(),
        present: false,
      }),
    ).toBe(false);
  });

  it('labels by whether a source is already loaded', () => {
    expect(
      appChromeActions.addMod.label({
        hasSource: true,
        openFolder: vi.fn(),
        present: true,
      }),
    ).toBe('app:actions.addMod');
    expect(
      appChromeActions.addMod.label({
        hasSource: false,
        openFolder: vi.fn(),
        present: true,
      }),
    ).toBe('app:actions.openModFolder');
  });

  it('delegates execute to the shared openFolder handler', () => {
    const openFolder = vi.fn();
    void appChromeActions.addMod.execute({
      hasSource: true,
      openFolder,
      present: true,
    });
    expect(openFolder).toHaveBeenCalledTimes(1);
  });
});

describe('appChromeActions.drawerToggle', () => {
  it('labels by drawer open state', () => {
    expect(
      appChromeActions.drawerToggle.label({ open: true, toggle: vi.fn() }),
    ).toBe('app:layout.drawer.collapse');
    expect(
      appChromeActions.drawerToggle.label({ open: false, toggle: vi.fn() }),
    ).toBe('app:layout.drawer.expand');
  });

  it('toggles on execute', () => {
    const toggle = vi.fn();
    void appChromeActions.drawerToggle.execute({ open: true, toggle });
    expect(toggle).toHaveBeenCalledTimes(1);
  });
});

describe('appChromeActions.openSettings', () => {
  it('opens settings on execute', () => {
    const openSettings = vi.fn();
    void appChromeActions.openSettings.execute({ openSettings });
    expect(openSettings).toHaveBeenCalledTimes(1);
    expect(appChromeActions.openSettings.label({ openSettings })).toBe(
      'app:header.appSettings.label',
    );
  });
});
