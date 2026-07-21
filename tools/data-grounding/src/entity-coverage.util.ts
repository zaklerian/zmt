import type {
  CharacterEntity,
  EquipmentEntity,
  IdeologyEntity,
  ModuleEntity,
  StateEntity,
  TechnologyEntity,
} from '@contracts';
import type { BlockNode, Script } from '@paradox-parser';

import {
  buildArchetypeIndex,
  extractCharacters,
  extractEquipment,
  extractIdeologies,
  extractModules,
  extractStates,
  extractTechnologies,
} from '@e-game-hoi4';

import type { EntityType } from './entity-type.const';
import type { UnmodeledKey } from './key-path.util';

import { collectUnmodeledKeys, keyNameOf } from './key-path.util';

// The projection each extractor performs is bespoke per entity (heterogeneous
// model shapes), so the "keys projected into the model" side is bespoke per type.
// Every builder below derives its modeled key paths from the *actual extracted
// entity* — a dropped leaf is absent from the model and therefore absent here, so
// it surfaces as unmodeled (the instrument cannot silently agree with a broken
// extractor). Only the structural block names (which the model descends into) and
// the bare-token list keys — neither of which lives in the model as data — are
// stated as literals; each mirrors a constant in the corresponding
// `libs/e-game-hoi4/src/<entity>/extract-*.util.ts` and moves with it (R-WORK-2).

export type ArchetypeIndex = ReadonlyMap<string, readonly string[]>;

export interface FileCoverage {
  readonly keys: readonly UnmodeledKey[];
  // Entity identifiers to drive an unmodified write through the mutation service
  // (loadAndLocate matches a block by key name; `state` blocks are keyed `state`).
  readonly writeTargets: readonly string[];
}

export function buildArchetypeIndexFor(
  scripts: readonly Script[],
): ArchetypeIndex {
  return buildArchetypeIndex(scripts);
}

export function computeFileCoverage(
  type: EntityType,
  script: Script,
  source: string,
  archetypeIndex: ArchetypeIndex,
): FileCoverage {
  switch (type) {
    case 'character':
      return coverCharacter(script, source);
    case 'equipment':
      return coverEquipment(script, source, archetypeIndex);
    case 'ideology':
      return coverIdeology(script, source);
    case 'module':
      return coverModule(script, source);
    case 'state':
      return coverState(script, source);
    case 'technology':
      return coverTechnology(script, source);
  }
}

function addLeaves(
  set: Set<string>,
  prefix: string,
  fields: readonly { readonly key: string }[],
): void {
  for (const field of fields) set.add(`${prefix}.${field.key}`);
}

// --- character -------------------------------------------------------------

function coverCharacter(script: Script, source: string): FileCoverage {
  const entities = extractCharacters(script);
  const blocks = wrapperBlocks(script, 'characters');
  const keys: UnmodeledKey[] = [];
  for (const entity of entities) {
    const block = blocks.get(entity.token);
    if (block === undefined) continue;
    keys.push(...collectUnmodeledKeys(block, modeledCharacter(entity), source));
  }
  return { keys, writeTargets: entities.map((entity) => entity.token) };
}

// --- equipment -------------------------------------------------------------

function coverEquipment(
  script: Script,
  source: string,
  archetypeIndex: ArchetypeIndex,
): FileCoverage {
  const entities = extractEquipment(script, archetypeIndex);
  const keys: UnmodeledKey[] = [];
  for (const entity of entities) {
    if (entity.node.value.kind !== 'Block') continue;
    keys.push(
      ...collectUnmodeledKeys(
        entity.node.value,
        modeledEquipment(entity),
        source,
      ),
    );
  }
  return { keys, writeTargets: entities.map((entity) => entity.name) };
}

// --- ideology --------------------------------------------------------------

function coverIdeology(script: Script, source: string): FileCoverage {
  const entities = extractIdeologies(script);
  const blocks = wrapperBlocks(script, 'ideologies');
  const keys: UnmodeledKey[] = [];
  for (const entity of entities) {
    const block = blocks.get(entity.token);
    if (block === undefined) continue;
    keys.push(...collectUnmodeledKeys(block, modeledIdeology(entity), source));
  }
  return { keys, writeTargets: entities.map((entity) => entity.token) };
}

// --- module ----------------------------------------------------------------

function coverModule(script: Script, source: string): FileCoverage {
  const entities = extractModules(script);
  const keys: UnmodeledKey[] = [];
  for (const entity of entities) {
    if (entity.node.value.kind !== 'Block') continue;
    keys.push(
      ...collectUnmodeledKeys(entity.node.value, modeledModule(entity), source),
    );
  }
  return { keys, writeTargets: entities.map((entity) => entity.name) };
}

// --- state -----------------------------------------------------------------

function coverState(script: Script, source: string): FileCoverage {
  const entities = extractStates(script);
  const blocks = topLevelBlocks(script, 'state');
  const keys: UnmodeledKey[] = [];
  // State has no wrapper key; extractor and locator iterate top-level `state`
  // blocks in identical file order, so index alignment is exact.
  entities.forEach((entity, index) => {
    const block = blocks[index];
    if (block === undefined) return;
    keys.push(...collectUnmodeledKeys(block, modeledState(entity), source));
  });
  return { keys, writeTargets: entities.length > 0 ? ['state'] : [] };
}

// --- technology ------------------------------------------------------------

function coverTechnology(script: Script, source: string): FileCoverage {
  const entities = extractTechnologies(script);
  const blocks = wrapperBlocks(script, 'technologies');
  const keys: UnmodeledKey[] = [];
  for (const entity of entities) {
    const block = blocks.get(entity.token);
    if (block === undefined) continue;
    keys.push(
      ...collectUnmodeledKeys(block, modeledTechnology(entity), source),
    );
  }
  return { keys, writeTargets: entities.map((entity) => entity.token) };
}

// Mirrors character/extract-characters.util.ts (KEY_NAME, PORTRAITS_BLOCK,
// TRAITS_BLOCK, INSTANCE_BLOCK, role-id blocks).
function modeledCharacter(entity: CharacterEntity): Set<string> {
  const set = new Set<string>(['name', 'portraits']);
  for (const group of entity.portraits) {
    set.add(`portraits.${group.group}`);
    addLeaves(set, `portraits.${group.group}`, group.rows);
  }
  for (const role of entity.roles) {
    const prefix = role.scope.length > 0 ? `instance.${role.id}` : role.id;
    if (role.scope.length > 0) set.add('instance');
    set.add(prefix);
    set.add(`${prefix}.traits`);
    addLeaves(set, prefix, role.scalars);
    for (const bag of role.bags) {
      set.add(`${prefix}.${bag.name}`);
      addLeaves(set, `${prefix}.${bag.name}`, bag.rows);
    }
  }
  return set;
}

// Mirrors equipment/extract-equipment.util.ts (KEY_ARCHETYPE, KEY_IS_ARCHETYPE,
// KEY_TYPE, KEY_INTERFACE_CATEGORY consumed for kind/classification/domain).
function modeledEquipment(entity: EquipmentEntity): Set<string> {
  const set = new Set<string>([
    'archetype',
    'interface_category',
    'is_archetype',
    'type',
  ]);
  for (const scalar of entity.scalars) set.add(scalar.key);
  return set;
}

// Mirrors ideology/extract-ideologies.util.ts (ROOT_KEYS, the four block names).
function modeledIdeology(entity: IdeologyEntity): Set<string> {
  const set = new Set<string>([
    'dynamic_faction_names',
    'faction_modifiers',
    'modifiers',
    'rules',
    'types',
  ]);
  for (const field of entity.rootScalars) set.add(field.key);
  addLeaves(set, 'rules', entity.rules);
  addLeaves(set, 'modifiers', entity.modifiers);
  addLeaves(set, 'faction_modifiers', entity.factionModifiers);
  for (const type of entity.types) {
    set.add(`types.${type.key}`);
    addLeaves(set, `types.${type.key}`, type.scalars);
  }
  return set;
}

// Mirrors module/extract-modules.util.ts (KEY_CATEGORY, the cost maps, the stat
// blocks).
function modeledModule(entity: ModuleEntity): Set<string> {
  const set = new Set<string>(['category']);
  for (const scalar of entity.scalars) set.add(scalar.key);
  const nested: Readonly<Record<string, readonly { readonly key: string }[]>> =
    {
      add_average_stats: entity.statBlocks.add_average_stats,
      add_stats: entity.statBlocks.add_stats,
      build_cost_resources: entity.costMaps.build_cost_resources,
      dismantle_cost_resources: entity.costMaps.dismantle_cost_resources,
      multiply_stats: entity.statBlocks.multiply_stats,
    };
  for (const [blockName, fields] of Object.entries(nested)) {
    set.add(blockName);
    addLeaves(set, blockName, fields);
  }
  return set;
}

// Mirrors state/extract-states.util.ts (ROOT_KEYS incl. id/name, the map blocks,
// thin history, bare-token provinces).
function modeledState(entity: StateEntity): Set<string> {
  const set = new Set<string>([
    'buildings',
    'history',
    'provinces',
    'resources',
  ]);
  for (const field of entity.rootScalars) set.add(field.key);
  addLeaves(set, 'resources', entity.resources);
  addLeaves(set, 'buildings', entity.buildings);
  addLeaves(set, 'history', entity.history);
  for (const province of entity.provinceBuildings) {
    set.add(`buildings.${province.id}`);
    addLeaves(set, `buildings.${province.id}`, province.rows);
  }
  return set;
}

// Mirrors technology/extract-technologies.util.ts (ROOT_KEYS, REF_LISTS source
// keys, FOLDER/POSITION/PATH blocks). `xor` is modeled lowercase, so an uppercase
// `XOR` in the source is (correctly) reported as unmodeled — the ADR 023 drop.
function modeledTechnology(entity: TechnologyEntity): Set<string> {
  const set = new Set<string>([
    'categories',
    'dependencies',
    'enable_equipment_modules',
    'enable_equipments',
    'enable_subunits',
    'folder',
    'folder.position',
    'path',
    'xor',
  ]);
  for (const field of entity.rootScalars) set.add(field.key);
  for (const folder of entity.folders) {
    addLeaves(set, 'folder', folder.scalars);
    addLeaves(set, 'folder.position', folder.position);
  }
  for (const path of entity.paths) addLeaves(set, 'path', path.scalars);
  return set;
}

function topLevelBlocks(script: Script, key: string): readonly BlockNode[] {
  const blocks: BlockNode[] = [];
  for (const child of script.children) {
    if (
      child.kind === 'Assignment' &&
      keyNameOf(child) === key &&
      child.value.kind === 'Block'
    ) {
      blocks.push(child.value);
    }
  }
  return blocks;
}

// Top-level `<wrapperKey> = { <id> = { … } }` entries, indexed by id — the block
// scan the wrapper-based extractors perform, exposed so coverage can enumerate the
// same source blocks the extractor read.
function wrapperBlocks(
  script: Script,
  wrapperKey: string,
): ReadonlyMap<string, BlockNode> {
  const blocks = new Map<string, BlockNode>();
  for (const child of script.children) {
    if (
      child.kind !== 'Assignment' ||
      keyNameOf(child) !== wrapperKey ||
      child.value.kind !== 'Block'
    ) {
      continue;
    }
    for (const entry of child.value.children) {
      if (entry.kind !== 'Assignment' || entry.value.kind !== 'Block') continue;
      if (!blocks.has(keyNameOf(entry)))
        blocks.set(keyNameOf(entry), entry.value);
    }
  }
  return blocks;
}
