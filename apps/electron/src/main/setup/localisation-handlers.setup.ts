import {
  IPC_CHANNELS,
  IPC_ERROR_CODES,
  IpcError,
  LocalisationLookupResult,
} from '@contracts';

import { resolveIndexSources } from '../entity-index';
import { ipcHandle } from '../ipc';
import { DEFAULT_LOC_LANGUAGE, lookupLocalisation } from '../localisation';
import { preferencesService } from '../preferences';
import { activeGameFolderPath, workspaceStoreService } from '../workspace';

export function registerLocalisationHandlers(): void {
  ipcHandle<LocalisationLookupResult>(
    IPC_CHANNELS.localisation.lookup,
    async (_event, rawKeys) =>
      lookupLocalisation(coerceKeys(rawKeys), {
        language: DEFAULT_LOC_LANGUAGE,
        // The store reach lives here, above the pure lookup — the same
        // composition boundary the write path uses (ADR 027 decision 6). The
        // save-target preference is read at LOOKUP time, not cached, so a target
        // changed in the settings panel applies to the next form that opens.
        sources: resolveIndexSources(
          workspaceStoreService.get(),
          await activeGameFolderPath(),
        ),
        writeTargets: (await preferencesService.get('writeTargets')) ?? {},
      }),
  );
}

function coerceKeys(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    throw {
      code: IPC_ERROR_CODES.BAD_REQUEST,
      message: 'keys must be an array',
    } satisfies IpcError;
  }
  return value.map((entry, index) => {
    if (typeof entry !== 'string') {
      throw {
        code: IPC_ERROR_CODES.BAD_REQUEST,
        message: `keys[${String(index)}] must be a string`,
      } satisfies IpcError;
    }
    return entry;
  });
}
