import type { EntityRecognizer } from '@zmt/renderer/plugin/util';

import { pending } from '@zmt/renderer/pending/util';

import { HOI4_ENTITY_IDS } from './hoi4-entity-id.const';

export const HOI4_ENTITY_FOLDERS = {
  character: ['common', 'characters'],
  equipment: ['common', 'units', 'equipment'],
  ideology: ['common', 'ideologies'],
  module: ['common', 'units', 'equipment', 'modules'],
  state: ['history', 'states'],
  technology: ['common', 'technologies'],
} as const satisfies Record<keyof typeof HOI4_ENTITY_IDS, readonly string[]>;

export const SCRIPT_EXTENSION = '.txt';

export function matchesEntityFolder(filePath: string, folder: readonly string[]): boolean {
  const segments = filePath.split(/[/\\]/u).filter((segment) => segment.length > 0);
  const last = segments.at(-1);
  if (!last?.toLowerCase().endsWith(SCRIPT_EXTENSION)) {
    return false;
  }
  const start = segments.length - 1 - folder.length;
  return start >= 0 && folder.every((segment, offset) => segments[start + offset] === segment);
}

function recognizer(entity: keyof typeof HOI4_ENTITY_IDS): EntityRecognizer {
  return {
    id: HOI4_ENTITY_IDS[entity],
    load: () => pending('ZMT-A-5'),
    matches: (filePath) => matchesEntityFolder(filePath, HOI4_ENTITY_FOLDERS[entity]),
  };
}

export const HOI4_CHARACTER_RECOGNIZER: EntityRecognizer = recognizer('character');

export const HOI4_EQUIPMENT_RECOGNIZER: EntityRecognizer = recognizer('equipment');

export const HOI4_IDEOLOGY_RECOGNIZER: EntityRecognizer = recognizer('ideology');

export const HOI4_MODULE_RECOGNIZER: EntityRecognizer = recognizer('module');

export const HOI4_STATE_RECOGNIZER: EntityRecognizer = recognizer('state');

export const HOI4_TECHNOLOGY_RECOGNIZER: EntityRecognizer = recognizer('technology');

export const HOI4_RECOGNIZERS: readonly EntityRecognizer[] = [
  HOI4_CHARACTER_RECOGNIZER,
  HOI4_EQUIPMENT_RECOGNIZER,
  HOI4_IDEOLOGY_RECOGNIZER,
  HOI4_MODULE_RECOGNIZER,
  HOI4_STATE_RECOGNIZER,
  HOI4_TECHNOLOGY_RECOGNIZER,
];
