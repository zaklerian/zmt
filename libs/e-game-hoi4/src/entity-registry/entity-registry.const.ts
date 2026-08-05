import type { EntityIndexShapes, IndexEntityType } from '@contracts';

import type { EntityRegistryEntry } from './entity-registry.model';

import { extractModules } from '../module/extract-modules.util';
import { MODULE_DIR } from '../module/module-location.const';
import { projectModuleSlim } from '../module/project-module-slim.util';
import { extractSprites } from '../sprite/extract-sprites.util';
import { projectSpriteSlim } from '../sprite/project-sprite-slim.util';
import {
  SPRITE_DIR,
  SPRITE_FILE_EXTENSION,
} from '../sprite/sprite-location.const';
import { extractTechnologyCategories } from '../technology-category/extract-technology-categories.util';
import { TECHNOLOGY_CATEGORY_DIR } from '../technology-category/technology-category-location.const';
import { extractTechnologies } from '../technology/extract-technologies.util';
import { projectTechnologySlim } from '../technology/project-technology-slim.util';
import { TECHNOLOGY_DIR } from '../technology/technology-location.const';

// The entity registry (ADR 024 decisions 2 + 4): each entry pins where an entity
// type's files live (`folder` — the single enumeration home, generalizing
// equipment's hard-coded EQUIPMENT_DIR), the existing extractor, the identity
// accessor stage-2 resolution keys on, and the slim projector `index:list` maps
// rows through. Module, technology, technology-category (its declared vocabulary,
// ZMT-35), and sprite (the `.gfx` declarations, ZMT-39 — the one type whose files
// are `.gfx`, not `.txt`, hence its `extension`) are registered; equipment does
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
  sprite: {
    entityId: 'sprite',
    extension: SPRITE_FILE_EXTENSION,
    extract: extractSprites,
    folder: SPRITE_DIR,
    identify: (entity) => entity.id,
    slimProjector: projectSpriteSlim,
  },
  technology: {
    entityId: 'technology',
    extract: extractTechnologies,
    folder: TECHNOLOGY_DIR,
    identify: (entity) => entity.token,
    slimProjector: projectTechnologySlim,
  },
  technologyCategory: {
    entityId: 'technologyCategory',
    extract: extractTechnologyCategories,
    folder: TECHNOLOGY_CATEGORY_DIR,
    identify: (entity) => entity.id,
    slimProjector: (entity) => ({ id: entity.id }),
  },
} satisfies {
  readonly [K in IndexEntityType]: EntityRegistryEntry<
    EntityIndexShapes[K]['entity'],
    EntityIndexShapes[K]['slim']
  >;
};

export type EntityTypeId = keyof typeof ENTITY_REGISTRY;
