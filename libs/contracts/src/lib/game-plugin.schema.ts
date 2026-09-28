import * as v from 'valibot';

export const GAME_IDS = {
  hoi4: 'hoi4',
  stellaris: 'stellaris',
  v3: 'v3',
} as const satisfies Record<string, string>;

export type GameId = (typeof GAME_IDS)[keyof typeof GAME_IDS];

export const GAME_ID_SCHEMA = v.picklist(Object.values(GAME_IDS));

export const FEATURE_IDS = {
  aircraft: 'aircraft',
  traits: 'traits',
} as const satisfies Record<string, string>;

export type FeatureId = (typeof FEATURE_IDS)[keyof typeof FEATURE_IDS];

export const FEATURE_ID_SCHEMA = v.picklist(Object.values(FEATURE_IDS));

export const FEATURE_CONTRIBUTION_SCHEMA = v.pipe(
  v.object({
    enabled: v.boolean(),
    featureId: FEATURE_ID_SCHEMA,
    label: v.pipe(v.string(), v.minLength(1)),
  }),
  v.readonly(),
);

export type FeatureContribution = v.InferOutput<typeof FEATURE_CONTRIBUTION_SCHEMA>;

export const GAME_PLUGIN_SCHEMA = v.pipe(
  v.object({
    displayName: v.pipe(v.string(), v.minLength(1)),
    features: v.pipe(v.array(FEATURE_CONTRIBUTION_SCHEMA), v.readonly()),
    gameId: GAME_ID_SCHEMA,
  }),
  v.readonly(),
);

export type GamePlugin = v.InferOutput<typeof GAME_PLUGIN_SCHEMA>;

export const GAME_PLUGIN_LIST_SCHEMA = v.pipe(v.array(GAME_PLUGIN_SCHEMA), v.readonly());

export type GamePluginList = v.InferOutput<typeof GAME_PLUGIN_LIST_SCHEMA>;
