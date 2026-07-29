import type { ModId } from '@contracts';

// The index result for one entity type: the resolved entities plus the sources
// table. Provenance is normalized — entities carry source ids, the table carries
// source detail.
export interface EntityIndexResult<T> {
  readonly entities: readonly IndexedEntity<T>[];
  readonly sources: Readonly<Record<SourceId, IndexSourceInfo>>;
}

// Per-entity provenance produced by stage 2. `sourceId` is the winning source;
// `shadowedSourceIds` are the sources whose same-name definitions this one
// overrode, in load order (empty for a sole definition). This is what later lets
// a write land in the entity's editable owning source, never a readonly one.
export interface EntityProvenance {
  readonly reason: EntityResolutionReason;
  readonly shadowedSourceIds: readonly SourceId[];
  readonly sourceId: SourceId;
}

// The entity-level resolution outcome for one surviving entity. A DISTINCT
// vocabulary from `ResolvedFile.reason` (the file resolver's
// 'last-wins' | 'replace-path' | 'sole-provider', which describes FILE
// resolution). This describes ENTITY-NAME resolution (ADR 024 ZMT-30 amendment,
// stage 2):
//   - 'sole-definition'      — the only definition of this name across all
//                              contributing files.
//   - 'overriding-definition'— a same-name definition overrode at least one
//                              lower-precedence definition in load order.
export type EntityResolutionReason =
  | 'overriding-definition'
  | 'sole-definition';

// One resolved entity: the extracted domain entity, its identity (the name the
// resolution keyed on), and its provenance. Generic over the entity type's
// extracted shape.
export interface IndexedEntity<T> {
  readonly entity: T;
  readonly id: string;
  readonly provenance: EntityProvenance;
}

// A projected source enriched with its mod id. `resolveProjectedSources`
// (workspace) drops the `IncludedMod.id`; the index keeps it so the `sources`
// table can carry `modId` per ADR 024 decision 3. `modId` is null for the
// vanilla game folder, which is a source with no mod identity.
export interface IndexSource {
  readonly modId: ModId | null;
  readonly path: string;
  readonly permission: 'editable' | 'readonly';
}

// The normalized source detail, stored once per source rather than denormalized
// onto every entity row (ADR 024 decision 3, alternatives). Joined by `SourceId`.
export interface IndexSourceInfo {
  readonly modId: ModId | null;
  readonly path: string;
  readonly permission: 'editable' | 'readonly';
}

// The stable identifier of a projected source within one index result. The
// source path is used: it is unique per projected source and already the natural
// key the write path resolves against. Entities carry these ids in their
// provenance; the companion `sources` table maps each id to its detail.
export type SourceId = string;
