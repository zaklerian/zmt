import { FEATURE_IDS, GAME_IDS, type GamePlugin } from '@zmt/contracts';

export const HOI4_PLUGIN: GamePlugin = {
  displayName: 'Hearts of Iron IV',
  features: [{ enabled: true, featureId: FEATURE_IDS.aircraft, label: 'Aircraft' }],
  gameId: GAME_IDS.hoi4,
};
