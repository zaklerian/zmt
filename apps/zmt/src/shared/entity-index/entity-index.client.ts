import type {
  IndexDetailResult,
  IndexEntityType,
  IndexListResult,
} from '@contracts';

// The typed renderer-side client over the source-scoped read layer (ADR 024
// decision 4). Thin by design — it wraps the two channels and nothing more, for a
// later canvas/hover/form to consume. `entityType` discriminates the returned
// row/detail type here at the renderer boundary; no `unknown` leaks through
// (regression gate 6). Errors surface through the ADR 008 model the preload
// parses — a `detail` for an unknown id rejects with a NOT_FOUND `IpcError`, which
// the caller treats as "refetch list."
export const entityIndexClient = {
  detail<K extends IndexEntityType>(
    entityType: K,
    id: string,
  ): Promise<IndexDetailResult<K>> {
    return window.api.index.detail(entityType, id);
  },
  list<K extends IndexEntityType>(entityType: K): Promise<IndexListResult<K>> {
    return window.api.index.list(entityType);
  },
};
