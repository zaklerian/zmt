import type { ModId } from '../workspace';

export interface EntityBlockDelta extends EntityScalarDelta {
  // null targets the entity's own scalars; a string names a direct child block.
  readonly block: null | string;
}

export interface EntityDeleteRequest {
  readonly entityName: string;
  readonly modId: ModId;
  readonly relativePath: string;
}

export interface EntityField {
  readonly key: string;
  readonly value: string;
}

export interface EntityScalarDelta {
  readonly added: readonly EntityField[];
  readonly changed: readonly EntityField[];
  readonly removed: readonly string[];
}

export interface EntityWriteRequest {
  readonly deltas: readonly EntityBlockDelta[];
  readonly entityName: string;
  readonly modId: ModId;
  readonly relativePath: string;
}
