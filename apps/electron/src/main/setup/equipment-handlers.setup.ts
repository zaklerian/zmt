import {
  EquipmentEntity,
  IPC_CHANNELS,
  IPC_ERROR_CODES,
  IpcError,
} from '@contracts';

import { listEquipment } from '../equipment';
import { ipcHandle } from '../ipc';

export function registerEquipmentHandlers(): void {
  ipcHandle<readonly EquipmentEntity[]>(
    IPC_CHANNELS.equipment.list,
    async (_event, rawFilePath) => {
      const filePath = requireString(rawFilePath, 'filePath');
      return listEquipment(filePath);
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
