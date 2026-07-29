import type { ModId } from '../workspace';

// The normalized source detail, stored once per source rather than denormalized
// onto every entity row (ADR 024 decision 3). Joined by `SourceId`. `modId` is
// null for the vanilla game folder, a source with no mod identity.
export interface IndexSourceInfo {
  readonly modId: ModId | null;
  readonly path: string;
  readonly permission: 'editable' | 'readonly';
}

// The stable identifier of a projected source within one index result. The
// source path is used: it is unique per projected source and already the natural
// key the write path resolves against. Entities carry these ids in their
// provenance; the companion `SourcesTable` maps each id to its detail.
export type SourceId = string;

// The companion table an `index:list` result returns alongside its rows: every
// contributing source's detail, keyed by the `SourceId` each row's provenance
// carries. The renderer joins a row to its winning/shadowed source detail through
// this table rather than reading source detail off the row (ADR 024 decision 3).
export type SourcesTable = Readonly<Record<SourceId, IndexSourceInfo>>;
