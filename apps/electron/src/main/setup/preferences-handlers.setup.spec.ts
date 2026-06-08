import { IPC_CHANNELS, Preferences } from '@contracts';
import { ipcMain } from 'electron';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { preferencesService } from '../preferences';
import {
  extractIpcError,
  getCapturedHandler,
  makeInvokeEvent,
} from './__test-utils__/capture-ipc-handler';
import { registerPreferencesHandlers } from './preferences-handlers.setup';

vi.mock('../preferences', () => ({
  preferencesService: {
    get: vi.fn(),
    getAll: vi.fn(),
    set: vi.fn(),
  },
}));

const emptyPreferences: Preferences = {
  locale: null,
  pluginSettings: {},
};

describe('registerPreferencesHandlers', () => {
  beforeEach(() => {
    vi.mocked(ipcMain.handle).mockReset();
    vi.mocked(preferencesService.get).mockReset();
    vi.mocked(preferencesService.getAll).mockReset();
    vi.mocked(preferencesService.set).mockReset();
    registerPreferencesHandlers();
  });

  describe('preferences:get', () => {
    it('returns the stored value for a known key', async () => {
      vi.mocked(preferencesService.get).mockResolvedValue('de');
      const handler = getCapturedHandler(IPC_CHANNELS.preferences.get);
      await expect(handler(makeInvokeEvent(), 'locale')).resolves.toBe('de');
      expect(preferencesService.get).toHaveBeenCalledWith('locale');
    });

    it('rejects with code 400 when the key is not a recognised preference', async () => {
      const handler = getCapturedHandler(IPC_CHANNELS.preferences.get);
      await expect(handler(makeInvokeEvent(), 'notARealKey')).rejects.toSatisfy(
        (error) => extractIpcError(error).code === 400,
      );
      expect(preferencesService.get).not.toHaveBeenCalled();
    });

    it('rejects with code 400 when the key is missing', async () => {
      const handler = getCapturedHandler(IPC_CHANNELS.preferences.get);
      await expect(handler(makeInvokeEvent())).rejects.toSatisfy(
        (error) => extractIpcError(error).code === 400,
      );
    });

    it('surfaces unexpected store failures as code 500', async () => {
      vi.mocked(preferencesService.get).mockRejectedValue(new Error('boom'));
      const handler = getCapturedHandler(IPC_CHANNELS.preferences.get);
      await expect(handler(makeInvokeEvent(), 'locale')).rejects.toSatisfy(
        (error) => extractIpcError(error).code === 500,
      );
    });
  });

  describe('preferences:set', () => {
    it('writes the value through to the store for a known key', async () => {
      vi.mocked(preferencesService.set).mockResolvedValue();
      const handler = getCapturedHandler(IPC_CHANNELS.preferences.set);
      await handler(makeInvokeEvent(), 'locale', 'de');
      expect(preferencesService.set).toHaveBeenCalledWith('locale', 'de');
    });

    it('passes null through to clear a preference', async () => {
      vi.mocked(preferencesService.set).mockResolvedValue();
      const handler = getCapturedHandler(IPC_CHANNELS.preferences.set);
      await handler(makeInvokeEvent(), 'locale', null);
      expect(preferencesService.set).toHaveBeenCalledWith('locale', null);
    });

    it('rejects with code 400 when the key is not a recognised preference', async () => {
      const handler = getCapturedHandler(IPC_CHANNELS.preferences.set);
      await expect(
        handler(makeInvokeEvent(), 'evil', 'value'),
      ).rejects.toSatisfy((error) => extractIpcError(error).code === 400);
      expect(preferencesService.set).not.toHaveBeenCalled();
    });
  });

  describe('preferences:getAll', () => {
    it('returns the merged preferences object from the store', async () => {
      vi.mocked(preferencesService.getAll).mockResolvedValue(emptyPreferences);
      const handler = getCapturedHandler(IPC_CHANNELS.preferences.getAll);
      await expect(handler(makeInvokeEvent())).resolves.toEqual(
        emptyPreferences,
      );
    });

    it('surfaces unexpected store failures as code 500', async () => {
      vi.mocked(preferencesService.getAll).mockRejectedValue(
        new Error('disk gone'),
      );
      const handler = getCapturedHandler(IPC_CHANNELS.preferences.getAll);
      await expect(handler(makeInvokeEvent())).rejects.toSatisfy(
        (error) => extractIpcError(error).code === 500,
      );
    });
  });
});
