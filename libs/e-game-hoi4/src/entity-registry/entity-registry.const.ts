import type { ModuleEntity, TechnologyEntity } from '@contracts';

import type { EntityRegistryEntry } from './entity-registry.model';

import { extractModules } from '../module/extract-modules.util';
import { MODULE_DIR } from '../module/module-location.const';
import { extractTechnologies } from '../technology/extract-technologies.util';
import { TECHNOLOGY_DIR } from '../technology/technology-location.const';

// The entity registry (ADR 024 decision 2): each entry pins where an entity
// type's files live (`folder` — the single enumeration home, generalizing
// equipment's hard-coded EQUIPMENT_DIR), the existing extractor, and the identity
// accessor stage-2 resolution keys on. Technology and module are registered this
// ticket; equipment does NOT migrate onto the index (decision 8). The object
// literal (not a Record) preserves each entry's specific entity type at the call
// site; `satisfies` contextually types the `identify` params and checks each
// entry against its shape.
export const ENTITY_REGISTRY = {
  module: {
    entityId: 'module',
    extract: extractModules,
    folder: MODULE_DIR,
    identify: (entity: ModuleEntity) => entity.name,
  },
  technology: {
    entityId: 'technology',
    extract: extractTechnologies,
    folder: TECHNOLOGY_DIR,
    identify: (entity: TechnologyEntity) => entity.token,
  },
} satisfies {
  readonly module: EntityRegistryEntry<ModuleEntity>;
  readonly technology: EntityRegistryEntry<TechnologyEntity>;
};

export type EntityTypeId = keyof typeof ENTITY_REGISTRY;
