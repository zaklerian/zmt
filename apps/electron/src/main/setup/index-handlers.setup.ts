import type { IndexDetailResult, IndexListResult, IpcError } from '@contracts';
import type { EntityTypeId } from '@e-game-hoi4';

import { IPC_CHANNELS, IPC_ERROR_CODES } from '@contracts';
import { ENTITY_REGISTRY } from '@e-game-hoi4';

import { indexReadService } from '../entity-index';
import { ipcHandle } from '../ipc';

export function registerIndexHandlers(): void {
  ipcHandle<IndexListResult<EntityTypeId>>(
    IPC_CHANNELS.index.list,
    async (_event, rawEntityType) =>
      indexReadService.list(requireEntityType(rawEntityType)),
  );

  ipcHandle<IndexDetailResult<EntityTypeId>>(
    IPC_CHANNELS.index.detail,
    async (_event, rawEntityType, rawId) =>
      indexReadService.detail(
        requireEntityType(rawEntityType),
        requireString(rawId, 'id'),
      ),
  );
}

function requireEntityType(value: unknown): EntityTypeId {
  if (typeof value !== 'string' || !Object.hasOwn(ENTITY_REGISTRY, value)) {
    throw {
      code: IPC_ERROR_CODES.BAD_REQUEST,
      message: `entityType must be one of: ${Object.keys(ENTITY_REGISTRY).join(', ')}`,
    } satisfies IpcError;
  }
  return value as EntityTypeId;
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
