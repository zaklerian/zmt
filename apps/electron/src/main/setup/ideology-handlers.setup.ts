import {
  IdeologyEntity,
  IPC_CHANNELS,
  IPC_ERROR_CODES,
  IpcError,
} from '@contracts';

import { listIdeologies } from '../ideology';
import { ipcHandle } from '../ipc';

export function registerIdeologyHandlers(): void {
  ipcHandle<readonly IdeologyEntity[]>(
    IPC_CHANNELS.ideology.list,
    async (_event, rawFilePath) => {
      const filePath = requireString(rawFilePath, 'filePath');
      return listIdeologies(filePath);
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
