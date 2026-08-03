import type { ModuleEntity, ModuleSlim } from '../module';
import type { TechnologyEntity, TechnologySlim } from '../technology';
import type {
  TechnologyCategoryEntity,
  TechnologyCategorySlim,
} from '../technology-category';
import type { SourcesTable } from './index-source.model';
import type { EntityProvenance, IndexedEntity } from './indexed-entity.model';

// The heterogeneous index's entity-type registry AT THE CONTRACT LEVEL: each
// entity type pins its full entity shape (`index:detail` returns it) and its slim
// projection shape (`index:list` rows carry it). This single map is what makes
// `entityType` discriminate the row/detail type at the client boundary — no
// `unknown` leaks to the renderer (ADR 024 decision 4). Adding an entity type to
// the index adds one entry here; the main-side registry (@e-game-hoi4) is typed
// to satisfy exactly this key set, so the two cannot drift.
export interface EntityIndexShapes {
  readonly module: {
    readonly entity: ModuleEntity;
    readonly slim: ModuleSlim;
  };
  readonly technology: {
    readonly entity: TechnologyEntity;
    readonly slim: TechnologySlim;
  };
  readonly technologyCategory: {
    readonly entity: TechnologyCategoryEntity;
    readonly slim: TechnologyCategorySlim;
  };
}

// `index:detail(entityType, id)` result: the full IndexedEntity (entity +
// provenance) for the hover card and edit form, discriminated by `entityType`.
export type IndexDetailResult<K extends IndexEntityType> = IndexedEntity<
  EntityIndexShapes[K]['entity']
>;

export type IndexEntityType = keyof EntityIndexShapes;

// `index:list(entityType)` result: the slim rows plus the companion sources
// table, discriminated by `entityType`. Workspace-scoped — all entities of the
// type, no server-side folder/country/category filter (those are renderer
// concerns over the returned set, ADR 024 decision 4).
export interface IndexListResult<K extends IndexEntityType> {
  readonly rows: readonly IndexSlimRow<EntityIndexShapes[K]['slim']>[];
  readonly sources: SourcesTable;
}

// One slim row: the entity's slim projection plus the provenance that rides it
// (winning source id + shadowed set + reason). Source DETAIL is not duplicated
// onto the row — `provenance.sourceId` joins the companion `SourcesTable` the
// list result returns (ADR 024 decision 3). The prompt's shorthand `rows: Slim[]`
// is realized as this wrapper so provenance can ride each row as required.
export interface IndexSlimRow<TSlim> {
  readonly provenance: EntityProvenance;
  readonly slim: TSlim;
}
