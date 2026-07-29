import type { EntityIndexShapes, IndexEntityType } from '@contracts';

import type { EntityRegistryEntry } from './entity-registry.model';

import { extractModules } from '../module/extract-modules.util';
import { MODULE_DIR } from '../module/module-location.const';
import { projectModuleSlim } from '../module/project-module-slim.util';
import { extractTechnologies } from '../technology/extract-technologies.util';
import { projectTechnologySlim } from '../technology/project-technology-slim.util';
import { TECHNOLOGY_DIR } from '../technology/technology-location.const';

// The entity registry (ADR 024 decisions 2 + 4): each entry pins where an entity
// type's files live (`folder` — the single enumeration home, generalizing
// equipment's hard-coded EQUIPMENT_DIR), the existing extractor, the identity
// accessor stage-2 resolution keys on, and the slim projector `index:list` maps
// rows through. Technology and module are registered this ticket; equipment does
// NOT migrate onto the index (decision 8). The object literal (not a Record)
// preserves each entry's specific entity/slim types at the call site; the
// `satisfies` is a mapped type over the CONTRACT map's key set (`IndexEntityType`)
// so the registry and the wire-level `EntityIndexShapes` cannot drift — a new
// entity type must appear in both or this stops compiling.
export const ENTITY_REGISTRY = {
  module: {
    entityId: 'module',
    extract: extractModules,
    folder: MODULE_DIR,
    identify: (entity) => entity.name,
    slimProjector: projectModuleSlim,
  },
  technology: {
    entityId: 'technology',
    extract: extractTechnologies,
    folder: TECHNOLOGY_DIR,
    identify: (entity) => entity.token,
    slimProjector: projectTechnologySlim,
  },
} satisfies {
  readonly [K in IndexEntityType]: EntityRegistryEntry<
    EntityIndexShapes[K]['entity'],
    EntityIndexShapes[K]['slim']
  >;
};

export type EntityTypeId = keyof typeof ENTITY_REGISTRY;
