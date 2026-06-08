export const FEATURE_IDS = {
  traits: 'traits',
} as const satisfies Record<string, string>;

export type FeatureId = (typeof FEATURE_IDS)[keyof typeof FEATURE_IDS];
