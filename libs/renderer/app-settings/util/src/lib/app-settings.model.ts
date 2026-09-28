import type { GameId } from '@zmt/contracts';

export type FeatureToggles = Readonly<Record<string, boolean>>;

export interface AppSettingsValues {
  readonly activeGameId: GameId;
  readonly features: FeatureToggles;
  readonly hideUnsupportedFiles: boolean;
}
