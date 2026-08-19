import {
  EntityBatchOperation,
  EntityBatchWriteRequest,
  EntityDeleteRequest,
  EntityWriteRequest,
  IPC_ERROR_CODES,
  IpcError,
  ModId,
  ProjectedSource,
  Workspace,
} from '@contracts';
import path from 'node:path';

import type { AstDelta } from './ast-scoped-delta.strategy';
import type { WriteOperation } from './write-batch.service';

import { entityIndexService } from '../entity-index';
import { applyWriteBatch } from './write-batch.service';

// The single-file entity write path (ADR 019) is now a thin adapter over the
// cross-file write boundary (ADR 027): each `entity:write` / `entity:delete`
// becomes a SINGLE-OP batch through `applyWriteBatch`, its Clausewitz edit compiled
// to an AST-scoped-delta (patch or delete). The seven shipped editable entities
// therefore route through the same boundary the TL surface will use, and — because
// the batch applies the identical delta and temp-writes the identical bytes — they
// write byte-identically to ADR 019 (the mandatory regression gate).
//
// The Electron-coupled config the write path used to reach through singletons (ADR
// 027 decision 6) is passed in: `workspace` resolves a `modId` to its editable mod
// path, `dialects` select the parser grammar, and `sources` are the already-resolved
// projected sources the path guard enforces against. This service constructs no
// `electron-store`.
export interface EntityMutationConfig {
  readonly dialects: readonly string[];
  readonly sources: readonly ProjectedSource[];
  readonly workspace: Workspace;
}

async function deleteEntity(
  request: EntityDeleteRequest,
  config: EntityMutationConfig,
): Promise<void> {
  const absolutePath = resolveModPath(
    request.modId,
    request.relativePath,
    config.workspace,
  );

  await applyWriteBatch(
    [
      {
        absolutePath,
        deltas: [{ entityName: request.entityName, kind: 'delete' }],
        format: 'ast',
      },
    ],
    { dialects: config.dialects, sources: config.sources },
  );
  // Same-tick guard (ADR 024 decision 5): invalidate the affected entity type's
  // index explicitly so a read after our own write never serves a stale index on
  // a coarse-mtime filesystem, independent of the read-side stat check.
  entityIndexService.invalidateForRelativePath(request.relativePath);
}

function resolveModPath(
  modId: ModId,
  relativePath: string,
  workspace: Workspace,
): string {
  const mod = workspace.includedMods.find(
    (candidate) => candidate.id === modId,
  );
  if (mod === undefined) {
    throw {
      code: IPC_ERROR_CODES.FORBIDDEN,
      message: `No editable mod for id: ${modId}`,
    } satisfies IpcError;
  }
  return path.resolve(mod.path, relativePath);
}

function toWriteOperation(
  operation: EntityBatchOperation,
  workspace: Workspace,
): WriteOperation {
  const absolutePath = resolveModPath(
    operation.modId,
    operation.relativePath,
    workspace,
  );
  if (operation.format === 'loc') {
    return { absolutePath, deltas: operation.deltas, format: 'loc' };
  }
  // A delete names N blocks in one file (ZMT-52) and compiles to that file's
  // ORDERED delta list — the same shape loc has always used, and the reason a
  // delete-tree spanning one file is one operation rather than N that
  // `assertOneOperationPerFile` would reject.
  if (operation.format === 'scriptDelete') {
    return {
      absolutePath,
      deltas: operation.entityNames.map((entityName) => ({
        entityName,
        kind: 'delete' as const,
      })),
      format: 'ast',
    };
  }
  // `insertUnder` selects the delta KIND (ADR 027 decision 4): present → create
  // `entityName` as a new named block under it, with the operation's deltas as the
  // new block's body; absent → the patch path every other caller takes.
  const delta: AstDelta =
    operation.insertUnder === undefined
      ? {
          deltas: operation.deltas,
          entityName: operation.entityName,
          kind: 'patch',
          renameTo: operation.renameTo,
        }
      : {
          body: operation.deltas,
          kind: 'insert',
          name: operation.entityName,
          parentName: operation.insertUnder,
        };
  return { absolutePath, deltas: [delta], format: 'ast' };
}

// The CROSS-FILE write (ADR 027 decision 3) as the entity layer exposes it: the
// caller's operations are resolved to absolute paths and handed to the batch as
// ONE all-or-nothing unit, so a technology `.txt` edit and its localisation `.yml`
// edit land together or not at all (ADR 028 decision 1). A single-op script batch
// through here is byte-identical to `writeEntity` — the same delta reaches the
// same strategy; only the operation list differs.
async function writeBatch(
  request: EntityBatchWriteRequest,
  config: EntityMutationConfig,
): Promise<void> {
  if (request.operations.length === 0) {
    throw {
      code: IPC_ERROR_CODES.BAD_REQUEST,
      message: 'operations must not be empty',
    } satisfies IpcError;
  }

  await applyWriteBatch(
    request.operations.map((operation) =>
      toWriteOperation(operation, config.workspace),
    ),
    { dialects: config.dialects, sources: config.sources },
  );
  // Same-tick guard (ADR 024 decision 5): see deleteEntity. Every operation's
  // path is invalidated — a batch can touch more than one entity type's folder.
  for (const operation of request.operations) {
    entityIndexService.invalidateForRelativePath(operation.relativePath);
  }
}

async function writeEntity(
  request: EntityWriteRequest,
  config: EntityMutationConfig,
): Promise<void> {
  const absolutePath = resolveModPath(
    request.modId,
    request.relativePath,
    config.workspace,
  );

  await applyWriteBatch(
    [
      {
        absolutePath,
        deltas: [
          {
            deltas: request.deltas,
            entityName: request.entityName,
            kind: 'patch',
          },
        ],
        format: 'ast',
      },
    ],
    { dialects: config.dialects, sources: config.sources },
  );
  // Same-tick guard (ADR 024 decision 5): see deleteEntity.
  entityIndexService.invalidateForRelativePath(request.relativePath);
}

export const entityMutationService = {
  delete: deleteEntity,
  write: writeEntity,
  writeBatch,
} as const;
