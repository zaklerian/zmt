import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AppSettingsActionContext,
  appSettingsActions,
} from './app-settings-actions';
import { PluginConfigFormValues } from './plugin-config.model';

const openFolderDialog = vi.fn<() => Promise<null | string>>();
const preferencesGet = vi.fn<(key: string) => Promise<unknown>>();
const preferencesSet = vi.fn<(key: string, value: unknown) => Promise<void>>();

function installApiMock(): void {
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: {
      fs: { openFolderDialog },
      preferences: { get: preferencesGet, set: preferencesSet },
    },
    writable: true,
  });
}

const values: PluginConfigFormValues = {
  activeGameId: 'hoi4',
  features: { someFeature: true },
};

function context(
  overrides: Partial<AppSettingsActionContext> = {},
): AppSettingsActionContext {
  return {
    close: vi.fn(),
    formDirty: false,
    gameFolderPath: '',
    gameFolderPathChanged: false,
    getValues: () => values,
    hideUnsupported: false,
    hideVanilla: false,
    hideVanillaChanged: false,
    modal: {
      confirm: vi.fn().mockResolvedValue(true),
      info: vi.fn().mockResolvedValue(undefined),
    },
    setGameFolderPath: vi.fn(),
    setSaveError: vi.fn(),
    toggleChanged: false,
    translate: (key) => key,
    ...overrides,
  };
}

beforeEach(() => {
  installApiMock();
  preferencesGet.mockReset().mockResolvedValue({});
  preferencesSet.mockReset().mockResolvedValue(undefined);
  openFolderDialog.mockReset();
});

describe('appSettingsActions.save availability', () => {
  it('is unavailable when no dirty/toggle/path flag is set', () => {
    expect(appSettingsActions.save.isAvailable(context())).toBe(false);
  });

  it('is available when any of the four state slices changed', () => {
    expect(
      appSettingsActions.save.isAvailable(context({ formDirty: true })),
    ).toBe(true);
    expect(
      appSettingsActions.save.isAvailable(context({ toggleChanged: true })),
    ).toBe(true);
    expect(
      appSettingsActions.save.isAvailable(
        context({ hideVanillaChanged: true }),
      ),
    ).toBe(true);
    expect(
      appSettingsActions.save.isAvailable(
        context({ gameFolderPathChanged: true }),
      ),
    ).toBe(true);
  });

  it('labels with the save i18n key', () => {
    expect(appSettingsActions.save.label(context())).toBe('app:actions.save');
  });
});

describe('appSettingsActions.save execute', () => {
  it('persists plugin settings and closes when the plugin form is dirty', async () => {
    const close = vi.fn();
    await appSettingsActions.save.execute(context({ close, formDirty: true }));
    expect(preferencesSet).toHaveBeenCalledWith(
      'pluginSettings',
      expect.objectContaining({
        hoi4: expect.objectContaining({ features: { someFeature: true } }),
      }),
    );
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('writes only the toggle preference when only the toggle changed', async () => {
    const close = vi.fn();
    await appSettingsActions.save.execute(
      context({ close, hideUnsupported: true, toggleChanged: true }),
    );
    expect(preferencesSet).toHaveBeenCalledWith('hideUnsupportedFiles', true);
    expect(preferencesSet).not.toHaveBeenCalledWith(
      'pluginSettings',
      expect.anything(),
    );
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('surfaces the error and does not close when persistence fails', async () => {
    preferencesSet.mockRejectedValue({ code: 500, message: 'nope' });
    const close = vi.fn();
    const setSaveError = vi.fn();
    await appSettingsActions.save.execute(
      context({ close, formDirty: true, setSaveError }),
    );
    expect(setSaveError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 500 }),
    );
    expect(close).not.toHaveBeenCalled();
  });
});

describe('appSettingsActions.cancel', () => {
  it('closes without confirming when nothing is dirty', async () => {
    const close = vi.fn();
    const confirm = vi.fn();
    await appSettingsActions.cancel.execute(
      context({ close, modal: { confirm, info: vi.fn() } }),
    );
    expect(confirm).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('confirms before closing when dirty and aborts on decline', async () => {
    const close = vi.fn();
    const confirm = vi.fn().mockResolvedValue(false);
    await appSettingsActions.cancel.execute(
      context({ close, formDirty: true, modal: { confirm, info: vi.fn() } }),
    );
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
  });
});

describe('appSettingsActions.browse', () => {
  it('applies the picked folder path', async () => {
    openFolderDialog.mockResolvedValue('/games/hoi4');
    const setGameFolderPath = vi.fn();
    await appSettingsActions.browse.execute(context({ setGameFolderPath }));
    expect(setGameFolderPath).toHaveBeenCalledWith('/games/hoi4');
  });

  it('ignores a cancelled dialog', async () => {
    openFolderDialog.mockResolvedValue(null);
    const setGameFolderPath = vi.fn();
    await appSettingsActions.browse.execute(context({ setGameFolderPath }));
    expect(setGameFolderPath).not.toHaveBeenCalled();
  });
});

describe('appSettingsActions.close', () => {
  it('invokes the close callback', () => {
    const close = vi.fn();
    void appSettingsActions.close.execute({ close });
    expect(close).toHaveBeenCalledTimes(1);
  });
});
