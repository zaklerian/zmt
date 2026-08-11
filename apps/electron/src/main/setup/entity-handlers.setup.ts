import {
  EntityBlockDelta,
  EntityBlockScopeSegment,
  EntityDeleteRequest,
  EntityField,
  EntityWriteRequest,
  IPC_CHANNELS,
  IPC_ERROR_CODES,
  IpcError,
} from '@contracts';
import { dialectsFromPlugins } from '@paradox-parser';

import type { EntityMutationConfig } from '../fs';

import { entityMutationService } from '../fs';
import { ipcHandle } from '../ipc';
import { pluginRegistryService } from '../plugins';
import {
  activeGameFolderPath,
  activeGameId,
  resolveProjectedSources,
  workspaceStoreService,
} from '../workspace';

export function registerEntityHandlers(): void {
  ipcHandle<void>(IPC_CHANNELS.entity.write, async (_event, rawRequest) => {
    await entityMutationService.write(
      coerceWriteRequest(rawRequest),
      await resolveMutationConfig(),
    );
  });

  ipcHandle<void>(IPC_CHANNELS.entity.delete, async (_event, rawRequest) => {
    await entityMutationService.delete(
      coerceDeleteRequest(rawRequest),
      await resolveMutationConfig(),
    );
  });
}

function badRequest(message: string): IpcError {
  return { code: IPC_ERROR_CODES.BAD_REQUEST, message };
}

function coerceBlockDelta(value: unknown, field: string): EntityBlockDelta {
  const record = requireRecord(value, field);
  return {
    added: requireFields(record.added, `${field}.added`),
    block: requireBlockPath(record.block, `${field}.block`),
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
  if (value.length === 0) {
    throw badRequest('deltas must not be empty');
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

function requireBlockPath(
  value: unknown,
  field: string,
): null | readonly EntityBlockScopeSegment[] {
  if (value === null) return null;
  if (!Array.isArray(value)) {
    throw badRequest(`${field} must be an array`);
  }
  return value.map((entry, index) =>
    requireBlockSegment(entry, `${field}[${String(index)}]`),
  );
}

// A scope segment is a bare-string child name or an indexed `{ name, index }`
// selecting the index-th repeated same-name block (ADR 019, amended ZMT-14).
function requireBlockSegment(
  value: unknown,
  field: string,
): EntityBlockScopeSegment {
  if (typeof value === 'string') return value;
  const record = requireRecord(value, field);
  const index = record.index;
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 0) {
    throw badRequest(`${field}.index must be a non-negative integer`);
  }
  return { index, name: requireString(record.name, `${field}.name`) };
}

function requireFields(value: unknown, field: string): readonly EntityField[] {
  if (!Array.isArray(value)) {
    throw badRequest(`${field} must be an array`);
  }
  return value.map((entry, index) => {
    const record = requireRecord(entry, `${field}[${String(index)}]`);
    return {
      key: requireString(record.key, `${field}[${String(index)}].key`),
      value: requireFieldValue(
        record.value,
        `${field}[${String(index)}].value`,
      ),
    };
  });
}

// A field value is a string scalar, or absent (null/undefined) for a bare
// value-list token (A-TS-1). An absent value normalizes to null at the wire so
// the serializer's bare-token branch keys on a single marker.
function requireFieldValue(value: unknown, field: string): null | string {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  throw badRequest(`${field} must be a string or null`);
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

// Resolves the write path's Electron-coupled config at the composition boundary
// (ADR 027 decision 6): the store reach lives here, above the pure write service.
// `sources` are resolved exactly as the store-backed path guard would resolve them,
// so a write behaves identically to before the dependency inversion.
async function resolveMutationConfig(): Promise<EntityMutationConfig> {
  const workspace = workspaceStoreService.get();
  return {
    dialects: dialectsFromPlugins(pluginRegistryService.list()),
    sources: resolveProjectedSources(
      activeGameId(),
      workspace,
      await activeGameFolderPath(),
    ),
    workspace,
  };
}
