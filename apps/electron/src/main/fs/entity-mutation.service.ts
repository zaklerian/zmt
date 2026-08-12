import {
  EntityDeleteRequest,
  EntityWriteRequest,
  IPC_ERROR_CODES,
  IpcError,
  ModId,
  ProjectedSource,
  Workspace,
} from '@contracts';
import path from 'node:path';

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
        delta: { entityName: request.entityName, kind: 'delete' },
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
        delta: {
          deltas: request.deltas,
          entityName: request.entityName,
          kind: 'patch',
        },
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
} as const;
