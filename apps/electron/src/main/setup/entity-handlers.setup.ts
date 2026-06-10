import {
  EntityDeleteRequest,
  EntityField,
  EntityScalarDelta,
  EntityWriteRequest,
  IPC_CHANNELS,
  IPC_ERROR_CODES,
  IpcError,
} from '@contracts';

import { entityMutationService } from '../fs';
import { ipcHandle } from '../ipc';

export function registerEntityHandlers(): void {
  ipcHandle<void>(IPC_CHANNELS.entity.write, async (_event, rawRequest) => {
    await entityMutationService.write(coerceWriteRequest(rawRequest));
  });

  ipcHandle<void>(IPC_CHANNELS.entity.delete, async (_event, rawRequest) => {
    await entityMutationService.delete(coerceDeleteRequest(rawRequest));
  });
}

function badRequest(message: string): IpcError {
  return { code: IPC_ERROR_CODES.BAD_REQUEST, message };
}

function coerceDeleteRequest(value: unknown): EntityDeleteRequest {
  const record = requireRecord(value, 'request');
  return {
    entityName: requireString(record.entityName, 'entityName'),
    modId: requireString(record.modId, 'modId'),
    relativePath: requireString(record.relativePath, 'relativePath'),
  };
}

function coerceDelta(value: unknown): EntityScalarDelta {
  const record = requireRecord(value, 'delta');
  return {
    added: requireFields(record.added, 'added'),
    changed: requireFields(record.changed, 'changed'),
    removed: requireStrings(record.removed, 'removed'),
  };
}

function coerceWriteRequest(value: unknown): EntityWriteRequest {
  const record = requireRecord(value, 'request');
  return {
    delta: coerceDelta(record.delta),
    entityName: requireString(record.entityName, 'entityName'),
    modId: requireString(record.modId, 'modId'),
    relativePath: requireString(record.relativePath, 'relativePath'),
  };
}

function requireFields(value: unknown, field: string): readonly EntityField[] {
  if (!Array.isArray(value)) {
    throw badRequest(`${field} must be an array`);
  }
  return value.map((entry, index) => {
    const record = requireRecord(entry, `${field}[${String(index)}]`);
    return {
      key: requireString(record.key, `${field}[${String(index)}].key`),
      value: requireString(record.value, `${field}[${String(index)}].value`),
    };
  });
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    throw badRequest(`${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw badRequest(`${field} must be a string`);
  }
  return value;
}

function requireStrings(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value)) {
    throw badRequest(`${field} must be an array`);
  }
  return value.map((entry, index) =>
    requireString(entry, `${field}[${String(index)}]`),
  );
}
