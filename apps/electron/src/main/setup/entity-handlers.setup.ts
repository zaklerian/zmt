import {
  EntityBlockDelta,
  EntityDeleteRequest,
  EntityField,
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

function coerceBlockDelta(value: unknown, field: string): EntityBlockDelta {
  const record = requireRecord(value, field);
  return {
    added: requireFields(record.added, `${field}.added`),
    block: requireBlockName(record.block, `${field}.block`),
    changed: requireFields(record.changed, `${field}.changed`),
    removed: requireStrings(record.removed, `${field}.removed`),
  };
}

function coerceDeleteRequest(value: unknown): EntityDeleteRequest {
  const record = requireRecord(value, 'request');
  return {
    entityName: requireString(record.entityName, 'entityName'),
    modId: requireString(record.modId, 'modId'),
    relativePath: requireString(record.relativePath, 'relativePath'),
  };
}

function coerceDeltas(value: unknown): readonly EntityBlockDelta[] {
  if (!Array.isArray(value)) {
    throw badRequest('deltas must be an array');
  }
  return value.map((entry, index) =>
    coerceBlockDelta(entry, `deltas[${String(index)}]`),
  );
}

function coerceWriteRequest(value: unknown): EntityWriteRequest {
  const record = requireRecord(value, 'request');
  return {
    deltas: coerceDeltas(record.deltas),
    entityName: requireString(record.entityName, 'entityName'),
    modId: requireString(record.modId, 'modId'),
    relativePath: requireString(record.relativePath, 'relativePath'),
  };
}

function requireBlockName(value: unknown, field: string): null | string {
  if (value === null) return null;
  if (typeof value === 'string') return value;
  throw badRequest(`${field} must be a string or null`);
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
