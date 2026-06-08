import {
  IPC_CHANNELS,
  IPC_ERROR_CODES,
  IpcError,
  isPreferenceKey,
  PreferenceKey,
  Preferences,
} from '@contracts';

import { ipcHandle } from '../ipc';
import { preferencesService } from '../preferences';

export function registerPreferencesHandlers(): void {
  ipcHandle<null | Preferences[PreferenceKey]>(
    IPC_CHANNELS.preferences.get,
    async (_event, rawKey) => {
      const key = requirePreferenceKey(rawKey);
      return preferencesService.get(key);
    },
  );

  ipcHandle<void>(
    IPC_CHANNELS.preferences.set,
    async (_event, rawKey, rawValue) => {
      const key = requirePreferenceKey(rawKey);
      await preferencesService.set(
        key,
        rawValue as null | Preferences[PreferenceKey],
      );
    },
  );

  ipcHandle<Preferences>(IPC_CHANNELS.preferences.getAll, async () =>
    preferencesService.getAll(),
  );
}

function requirePreferenceKey(value: unknown): PreferenceKey {
  if (!isPreferenceKey(value)) {
    throw {
      code: IPC_ERROR_CODES.BAD_REQUEST,
      message: `Unknown preference key: ${String(value)}`,
    } satisfies IpcError;
  }
  return value;
}
