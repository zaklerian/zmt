import type { EntityRecognizer } from '@zmt/renderer/plugin/util';

import { pending } from '@zmt/renderer/pending/util';

import { HOI4_ENTITY_IDS } from './hoi4-entity-id.const';

export const HOI4_CHARACTER_RECOGNIZER: EntityRecognizer = {
  id: HOI4_ENTITY_IDS.character,
  load: () => pending('ZMT-A-5'),
  matches: () => pending('ZMT-A-5'),
};

export const HOI4_EQUIPMENT_RECOGNIZER: EntityRecognizer = {
  id: HOI4_ENTITY_IDS.equipment,
  load: () => pending('ZMT-A-5'),
  matches: () => pending('ZMT-A-5'),
};

export const HOI4_IDEOLOGY_RECOGNIZER: EntityRecognizer = {
  id: HOI4_ENTITY_IDS.ideology,
  load: () => pending('ZMT-A-5'),
  matches: () => pending('ZMT-A-5'),
};

export const HOI4_MODULE_RECOGNIZER: EntityRecognizer = {
  id: HOI4_ENTITY_IDS.module,
  load: () => pending('ZMT-A-5'),
  matches: () => pending('ZMT-A-5'),
};

export const HOI4_STATE_RECOGNIZER: EntityRecognizer = {
  id: HOI4_ENTITY_IDS.state,
  load: () => pending('ZMT-A-5'),
  matches: () => pending('ZMT-A-5'),
};

export const HOI4_TECHNOLOGY_RECOGNIZER: EntityRecognizer = {
  id: HOI4_ENTITY_IDS.technology,
  load: () => pending('ZMT-A-5'),
  matches: () => pending('ZMT-A-5'),
};

export const HOI4_RECOGNIZERS: readonly EntityRecognizer[] = [
  HOI4_CHARACTER_RECOGNIZER,
  HOI4_EQUIPMENT_RECOGNIZER,
  HOI4_IDEOLOGY_RECOGNIZER,
  HOI4_MODULE_RECOGNIZER,
  HOI4_STATE_RECOGNIZER,
  HOI4_TECHNOLOGY_RECOGNIZER,
];
