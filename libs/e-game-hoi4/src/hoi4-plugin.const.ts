import type { ParadoxDialect } from '@paradox-parser';

import { FEATURE_IDS, GAME_IDS, GamePlugin } from '@contracts';

import { HOI4_MOD_DESCRIPTOR_SCHEMA_EXTENSION } from './mod-descriptor-schema.const';

const HOI4_DIALECTS: readonly ParadoxDialect[] = ['hoi4_bracket_expr'];

export const HOI4_PLUGIN: GamePlugin = {
  displayName: 'Hearts of Iron IV',
  features: [
    { enabled: true, featureId: FEATURE_IDS.aircraft, label: 'Aircraft' },
  ],
  gameId: GAME_IDS.hoi4,
  modDescriptorSchemaExtension: HOI4_MOD_DESCRIPTOR_SCHEMA_EXTENSION,
  parserExtension: {
    dialects: HOI4_DIALECTS,
  },
};
