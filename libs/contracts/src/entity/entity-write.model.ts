import type { ModId } from '../workspace';

export interface EntityBlockDelta extends EntityScalarDelta {
  // null or an empty path targets the entity's own scalars; each element descends
  // one named child block, so a multi-element path reaches a grandchild and below
  // (ADR 019, amended ZMT-13). An item whose `value` is empty is a bare value-list
  // token (e.g. a `traits` entry), written without an `= value`; a non-empty value
  // is a `key = value` scalar.
  readonly block: null | readonly string[];
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
