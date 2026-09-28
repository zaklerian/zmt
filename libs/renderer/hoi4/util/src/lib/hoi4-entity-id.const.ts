export const HOI4_ENTITY_IDS = {
  character: 'hoi4-character',
  equipment: 'hoi4-equipment',
  ideology: 'hoi4-ideology',
  module: 'hoi4-module',
  state: 'hoi4-state',
  technology: 'hoi4-technology',
} as const satisfies Record<string, string>;

export type Hoi4EntityId = (typeof HOI4_ENTITY_IDS)[keyof typeof HOI4_ENTITY_IDS];

export const HOI4_ENTITY_ID_LIST: readonly Hoi4EntityId[] = Object.values(HOI4_ENTITY_IDS);
