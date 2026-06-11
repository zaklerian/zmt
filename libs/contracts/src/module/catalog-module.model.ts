import type { ModuleDomain } from './module-entity.model';

// Name-identity projection of a module across the whole workspace: one entry per
// surviving module name after cross-source last-wins dedup. `source` records the
// winning source. Distinct from ModuleEntity (single-file, lossless) — the
// catalog is the lighter per-slot-picker surface, not the editable entity.
export interface CatalogModule {
  readonly category: string;
  readonly domain: ModuleDomain;
  readonly name: string;
  readonly source: string;
}
