import {
  EquipmentEntity,
  EquipmentSlotsRequest,
  EquipmentSlotsResult,
  IPC_CHANNELS,
  IPC_ERROR_CODES,
  IpcError,
} from '@contracts';

import { listEquipment } from '../equipment';
import { readEquipmentSlots } from '../fs';
import { ipcHandle } from '../ipc';

export function registerEquipmentHandlers(): void {
  ipcHandle<readonly EquipmentEntity[]>(
    IPC_CHANNELS.equipment.list,
    async (_event, rawFilePath) => {
      const filePath = requireString(rawFilePath, 'filePath');
      return listEquipment(filePath);
    },
  );

  ipcHandle<EquipmentSlotsResult>(
    IPC_CHANNELS.equipment.slots,
    async (_event, rawRequest) =>
      readEquipmentSlots(coerceSlotsRequest(rawRequest)),
  );
}

function coerceSlotsRequest(value: unknown): EquipmentSlotsRequest {
  const record = requireRecord(value, 'request');
  return {
    entityName: requireString(record.entityName, 'entityName'),
    modId: requireString(record.modId, 'modId'),
    relativePath: requireString(record.relativePath, 'relativePath'),
  };
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    throw {
      code: IPC_ERROR_CODES.BAD_REQUEST,
      message: `${field} must be an object`,
    } satisfies IpcError;
  }
  return value as Record<string, unknown>;
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
