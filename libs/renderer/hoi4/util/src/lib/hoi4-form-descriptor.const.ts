import type { EntityFormDescriptor } from '@zmt/renderer/plugin/util';

import { GAME_IDS } from '@zmt/contracts';
import { pending } from '@zmt/renderer/pending/util';

import { HOI4_ENTITY_IDS } from './hoi4-entity-id.const';

export const HOI4_CHARACTER_FORM_DESCRIPTOR: EntityFormDescriptor = {
  entityId: HOI4_ENTITY_IDS.character,
  gameId: GAME_IDS.hoi4,
  project: () => pending('ZMT-A-5'),
};

export const HOI4_EQUIPMENT_FORM_DESCRIPTOR: EntityFormDescriptor = {
  entityId: HOI4_ENTITY_IDS.equipment,
  gameId: GAME_IDS.hoi4,
  project: () => pending('ZMT-A-5'),
};

export const HOI4_IDEOLOGY_FORM_DESCRIPTOR: EntityFormDescriptor = {
  entityId: HOI4_ENTITY_IDS.ideology,
  gameId: GAME_IDS.hoi4,
  project: () => pending('ZMT-A-5'),
};

export const HOI4_MODULE_FORM_DESCRIPTOR: EntityFormDescriptor = {
  entityId: HOI4_ENTITY_IDS.module,
  gameId: GAME_IDS.hoi4,
  project: () => pending('ZMT-A-5'),
};

export const HOI4_STATE_FORM_DESCRIPTOR: EntityFormDescriptor = {
  entityId: HOI4_ENTITY_IDS.state,
  gameId: GAME_IDS.hoi4,
  project: () => pending('ZMT-A-5'),
};

export const HOI4_TECHNOLOGY_FORM_DESCRIPTOR: EntityFormDescriptor = {
  entityId: HOI4_ENTITY_IDS.technology,
  gameId: GAME_IDS.hoi4,
  project: () => pending('ZMT-A-5'),
};

export const HOI4_FORM_DESCRIPTORS: readonly EntityFormDescriptor[] = [
  HOI4_CHARACTER_FORM_DESCRIPTOR,
  HOI4_EQUIPMENT_FORM_DESCRIPTOR,
  HOI4_IDEOLOGY_FORM_DESCRIPTOR,
  HOI4_MODULE_FORM_DESCRIPTOR,
  HOI4_STATE_FORM_DESCRIPTOR,
  HOI4_TECHNOLOGY_FORM_DESCRIPTOR,
];
