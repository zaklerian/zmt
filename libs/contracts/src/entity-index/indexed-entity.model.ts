import type { SourceId } from './index-source.model';

// Per-entity provenance produced by stage 2. `sourceId` is the winning source;
// `shadowedSourceIds` are the sources whose same-name definitions this one
// overrode, in load order (empty for a sole definition). This is what later lets
// a write land in the entity's editable owning source, never a readonly one.
// Crosses IPC via `index:detail` (on the full entity) and `index:list` (on every
// slim row), so it lives in @contracts (R-ELECTRON-2).
export interface EntityProvenance {
  readonly reason: EntityResolutionReason;
  readonly shadowedSourceIds: readonly SourceId[];
  readonly sourceId: SourceId;
}

// The entity-level resolution outcome for one surviving entity. A DISTINCT
// vocabulary from the file resolver's 'last-wins' | 'replace-path' |
// 'sole-provider' (which describes FILE resolution). This describes ENTITY-NAME
// resolution (ADR 024 ZMT-30 amendment, stage 2):
//   - 'sole-definition'       — the only definition of this name across all
//                               contributing files.
//   - 'overriding-definition' — a same-name definition overrode at least one
//                               lower-precedence definition in load order.
export type EntityResolutionReason =
  | 'overriding-definition'
  | 'sole-definition';

// One resolved entity: the extracted domain entity, its identity (the name the
// resolution keyed on), and its provenance. Generic over the payload — the full
// extracted shape for `index:detail`, and reused for the slim row's payload
// nowhere (the slim row wraps its own projection + provenance; see IndexSlimRow).
export interface IndexedEntity<T> {
  readonly entity: T;
  readonly id: string;
  readonly provenance: EntityProvenance;
}
