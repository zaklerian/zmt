import type { ModId } from '../workspace';

export interface EntityBlockDelta extends EntityScalarDelta {
  // null or an empty path targets the entity's own scalars; each element descends
  // one named child block, so a multi-element path reaches a grandchild and below
  // (ADR 019, amended ZMT-13). A bare-string segment selects the sole named child
  // (unchanged); a `{ name, index }` segment selects the index-th sibling named
  // `name`, addressing one of N repeated same-name blocks (ADR 019, amended
  // ZMT-14). An item whose `value` is absent (`null`) is a bare value-list token
  // (e.g. a `traits` entry), written without an `= value`; any value, including
  // the empty string `""`, is a `key = value` scalar.
  readonly block: null | readonly EntityBlockScopeSegment[];
}

// One step of a write scope path (ADR 019, amended ZMT-14). A bare string names
// the sole child block; an indexed segment selects the index-th sibling sharing
// `name`, the only form that can address repeated same-name blocks (object-list).
export type EntityBlockScopeSegment =
  | { readonly index: number; readonly name: string }
  | string;

export interface EntityDeleteRequest {
  readonly entityName: string;
  readonly modId: ModId;
  readonly relativePath: string;
}

export interface EntityField {
  readonly key: string;
  // Intentional asymmetry (ZMT-13.1): an absent value (`null`) marks a bare
  // value-list token (e.g. a `traits` entry), serialized as the token alone; ANY
  // value, including the empty string `""`, serializes as `key = value`. `""` is a
  // legal, distinct empty-string scalar that must round-trip as itself, so it
  // cannot double as the bare-token marker (A-TS-1).
  readonly value: null | string;
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
