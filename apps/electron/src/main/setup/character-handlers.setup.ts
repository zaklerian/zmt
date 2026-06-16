import {
  CharacterEntity,
  IPC_CHANNELS,
  IPC_ERROR_CODES,
  IpcError,
} from '@contracts';

import { listCharacters } from '../character';
import { ipcHandle } from '../ipc';

export function registerCharacterHandlers(): void {
  ipcHandle<readonly CharacterEntity[]>(
    IPC_CHANNELS.character.list,
    async (_event, rawFilePath) => {
      const filePath = requireString(rawFilePath, 'filePath');
      return listCharacters(filePath);
    },
  );
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw {
      code: IPC_ERROR_CODES.BAD_REQUEST,
      message: `${field} must be a string`,
    } satisfies IpcError;
  }
  return value;
}
