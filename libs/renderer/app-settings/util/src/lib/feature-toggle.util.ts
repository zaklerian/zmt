import type { FeatureContribution } from '@zmt/contracts';

import type { FeatureToggles } from './app-settings.model';

export function isFeatureEnabled(toggles: FeatureToggles, feature: FeatureContribution): boolean {
  return toggles[feature.featureId] ?? feature.enabled;
}
