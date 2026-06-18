import {
  IPC_CHANNELS,
  IPC_ERROR_CODES,
  IpcError,
  StateEntity,
} from '@contracts';

import { ipcHandle } from '../ipc';
import { listStates } from '../state';

export function registerStateHandlers(): void {
  ipcHandle<readonly StateEntity[]>(
    IPC_CHANNELS.state.list,
    async (_event, rawFilePath) => {
      const filePath = requireString(rawFilePath, 'filePath');
      return listStates(filePath);
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
