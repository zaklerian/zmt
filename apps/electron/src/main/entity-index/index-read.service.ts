import type {
  IndexDetailResult,
  IndexListResult,
  IndexSlimRow,
  IpcError,
  SourcesTable,
} from '@contracts';
import type { EntityRegistryEntry, EntityTypeId } from '@e-game-hoi4';

import { IPC_ERROR_CODES } from '@contracts';
import { ENTITY_REGISTRY } from '@e-game-hoi4';

import { entityIndexService } from './entity-index.service';

// `index:detail(entityType, id)` — the full IndexedEntity (entity + provenance)
// for the hover card and edit form, read from the same cached snapshot as `list`
// (no re-resolve). An unknown id — the cache rebuilt on an mtime change between a
// `list` and this call and the id no longer exists — returns a clean NOT_FOUND
// through the ADR 008 model, never a thrown raw error and never a re-resolve that
// returns a different entity. The renderer treats not-found as "refetch list."
async function detail(
  entityType: EntityTypeId,
  id: string,
): Promise<IndexDetailResult<EntityTypeId>> {
  const { entities } = await readFor(entityType);
  const found = entities.find((indexed) => indexed.id === id);
  if (found === undefined) {
    throw {
      code: IPC_ERROR_CODES.NOT_FOUND,
      message: `No ${entityType} entity with id "${id}"`,
    } satisfies IpcError;
  }
  return found;
}

// `index:list(entityType)` — workspace-scoped slim rows for every entity of the
// type, plus the companion sources table (ADR 024 decision 4). No server-side
// folder/country/category filter; those are renderer concerns over the returned
// set.
async function list(
  entityType: EntityTypeId,
): Promise<IndexListResult<EntityTypeId>> {
  switch (entityType) {
    case 'module':
      return listWith(ENTITY_REGISTRY.module);
    case 'technology':
      return listWith(ENTITY_REGISTRY.technology);
    default: {
      const exhaustive: never = entityType;
      throw new Error(`Unhandled entity type: ${String(exhaustive)}`);
    }
  }
}

// Generic per-entry list: read the cached index, wrap each resolved entity as a
// slim row (its projection + the provenance that rides it), and return the rows
// with the companion sources table. Generic over T/TSlim so the projector call
// stays typed; the caller narrows `entityType` to a concrete entry before calling.
async function listWith<T, TSlim>(
  entry: EntityRegistryEntry<T, TSlim>,
): Promise<{
  readonly rows: readonly IndexSlimRow<TSlim>[];
  readonly sources: SourcesTable;
}> {
  const { entities, sources } = await entityIndexService.read(entry);
  const rows = entities.map((indexed) => ({
    provenance: indexed.provenance,
    slim: entry.slimProjector(indexed.entity),
  }));
  return { rows, sources };
}

// The cached index read for one entity type, narrowed so each branch binds the
// concrete entry type. Both `list` and `detail` read through this same cached
// snapshot (entity-index.service caches per type), so a `detail` immediately
// after a `list` serves from cache and does not re-resolve (ADR 024 decision 5).
function readFor(entityType: EntityTypeId) {
  switch (entityType) {
    case 'module':
      return entityIndexService.read(ENTITY_REGISTRY.module);
    case 'technology':
      return entityIndexService.read(ENTITY_REGISTRY.technology);
    default: {
      const exhaustive: never = entityType;
      throw new Error(`Unhandled entity type: ${String(exhaustive)}`);
    }
  }
}

export const indexReadService = {
  detail,
  list,
} as const;
