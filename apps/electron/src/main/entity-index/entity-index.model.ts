import type { IndexedEntity, ModId, SourcesTable } from '@contracts';

// The index result for one entity type: the resolved entities plus the sources
// table. Provenance is normalized — entities carry source ids, the table carries
// source detail. The wire-facing pieces (`IndexedEntity`, `EntityProvenance`,
// `IndexSourceInfo`/`SourcesTable`) now live in @contracts — `index:detail`
// returns `IndexedEntity` and `index:list` returns a `SourcesTable` across IPC
// (R-ELECTRON-2). This main-only result composes them with the stage-2 input.
export interface EntityIndexResult<T> {
  readonly entities: readonly IndexedEntity<T>[];
  readonly sources: SourcesTable;
}

// A projected source enriched with its mod id. MAIN-ONLY (stage-2 input): the
// resolver consumes this to build the normalized `SourcesTable` that crosses the
// wire; the raw source list itself never does. `resolveProjectedSources`
// (workspace) drops the `IncludedMod.id`; the index keeps it so the `sources`
// table can carry `modId` per ADR 024 decision 3. `modId` is null for the vanilla
// game folder, which is a source with no mod identity.
export interface IndexSource {
  readonly modId: ModId | null;
  readonly path: string;
  readonly permission: 'editable' | 'readonly';
}
