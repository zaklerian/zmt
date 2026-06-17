import {
  IPC_CHANNELS,
  IPC_ERROR_CODES,
  IpcError,
  TechnologyEntity,
} from '@contracts';

import { ipcHandle } from '../ipc';
import { listTechnologies } from '../technology';

export function registerTechnologyHandlers(): void {
  ipcHandle<readonly TechnologyEntity[]>(
    IPC_CHANNELS.technology.list,
    async (_event, rawFilePath) => {
      const filePath = requireString(rawFilePath, 'filePath');
      return listTechnologies(filePath);
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
