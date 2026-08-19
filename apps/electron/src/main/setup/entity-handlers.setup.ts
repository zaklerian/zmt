import {
  EntityBatchOperation,
  EntityBatchWriteRequest,
  EntityBlockDelta,
  EntityBlockScopeSegment,
  EntityDeleteRequest,
  EntityField,
  EntityWriteRequest,
  IPC_CHANNELS,
  IPC_ERROR_CODES,
  IpcError,
  LocDelta,
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

  ipcHandle<void>(
    IPC_CHANNELS.entity.writeBatch,
    async (_event, rawRequest) => {
      await entityMutationService.writeBatch(
        coerceBatchWriteRequest(rawRequest),
        await resolveMutationConfig(),
      );
    },
  );
}

function badRequest(message: string): IpcError {
  return { code: IPC_ERROR_CODES.BAD_REQUEST, message };
}

// The batch request crosses the SAME untrusted boundary as `entity:write`, so it
// is coerced with the same discipline: every field checked, nothing passed
// through. A loc operation's delta is validated per `kind` — the union is closed,
// so an unknown kind is a bad request rather than a silently-ignored operation.
function coerceBatchOperation(
  value: unknown,
  field: string,
): EntityBatchOperation {
  const record = requireRecord(value, field);
  const modId = requireString(record.modId, `${field}.modId`);
  const relativePath = requireString(
    record.relativePath,
    `${field}.relativePath`,
  );
  const format = requireString(record.format, `${field}.format`);
  if (format === 'loc') {
    if (!Array.isArray(record.deltas) || record.deltas.length === 0) {
      throw badRequest(`${field}.deltas must be a non-empty array`);
    }
    return {
      deltas: record.deltas.map((entry, index) =>
        coerceLocDelta(entry, `${field}.deltas[${String(index)}]`),
      ),
      format: 'loc',
      modId,
      relativePath,
    };
  }
  if (format === 'script') {
    if (!Array.isArray(record.deltas)) {
      throw badRequest(`${field}.deltas must be an array`);
    }
    const renameTo =
      record.renameTo === undefined
        ? undefined
        : requireString(record.renameTo, `${field}.renameTo`);
    const insertUnder =
      record.insertUnder === undefined
        ? undefined
        : requireString(record.insertUnder, `${field}.insertUnder`);
    // Creating a block and renaming it in the same operation is incoherent, and
    // the pair would silently resolve to whichever the strategy checked first.
    if (insertUnder !== undefined && renameTo !== undefined) {
      throw badRequest(`${field} must not carry both insertUnder and renameTo`);
    }
    // Unlike `entity:write`, an empty delta list is legal here — but only
    // alongside a rename. Neither present is a no-op operation, which would
    // rewrite a file for nothing and is a caller bug, not a valid request. An
    // insert with an empty body is likewise a caller bug: it would write a
    // technology with no fields at all.
    if (record.deltas.length === 0 && renameTo === undefined) {
      throw badRequest(`${field} must carry deltas or renameTo`);
    }
    return {
      deltas: record.deltas.map((entry, index) =>
        coerceBlockDelta(entry, `${field}.deltas[${String(index)}]`),
      ),
      entityName: requireString(record.entityName, `${field}.entityName`),
      format: 'script',
      modId,
      relativePath,
      ...(insertUnder === undefined ? {} : { insertUnder }),
      ...(renameTo === undefined ? {} : { renameTo }),
    };
  }
  throw badRequest(`${field}.format must be "loc" or "script"`);
}

function coerceBatchWriteRequest(value: unknown): EntityBatchWriteRequest {
  const record = requireRecord(value, 'request');
  if (!Array.isArray(record.operations)) {
    throw badRequest('operations must be an array');
  }
  if (record.operations.length === 0) {
    throw badRequest('operations must not be empty');
  }
  return {
    operations: record.operations.map((entry, index) =>
      coerceBatchOperation(entry, `operations[${String(index)}]`),
    ),
  };
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

function coerceLocDelta(value: unknown, field: string): LocDelta {
  const record = requireRecord(value, field);
  const key = requireString(record.key, `${field}.key`);
  const kind = requireString(record.kind, `${field}.kind`);
  switch (kind) {
    case 'delete':
      return { key, kind: 'delete' };
    case 'insert':
      return {
        key,
        kind: 'insert',
        value: requireString(record.value, `${field}.value`),
        version: requireString(record.version, `${field}.version`),
      };
    case 'set':
      return {
        key,
        kind: 'set',
        value: requireString(record.value, `${field}.value`),
      };
    default:
      throw badRequest(`${field}.kind must be "delete", "insert" or "set"`);
  }
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
