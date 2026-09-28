import type { FeatureContribution, FeatureId, GamePlugin } from '@zmt/contracts';

import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import type { FeatureToggles } from '../util';

import { isFeatureEnabled } from '../util';
import { AppSettingsStore } from './app-settings.store';

export interface FeatureNavState {
  readonly activeFeatureId: FeatureId | null;
}

const INITIAL_STATE: FeatureNavState = {
  activeFeatureId: null,
};

export function enabledFeatures(
  plugins: readonly GamePlugin[],
  toggles: FeatureToggles,
): readonly FeatureContribution[] {
  return plugins.flatMap((plugin) =>
    plugin.features.filter((feature) => isFeatureEnabled(toggles, feature)),
  );
}

export const FeatureNavStore = signalStore(
  { providedIn: 'root' },
  withState(INITIAL_STATE),
  withComputed(({ activeFeatureId }, settings = inject(AppSettingsStore)) => {
    const features = computed(() => enabledFeatures(settings.plugins(), settings.featureToggles()));
    return {
      activeFeature: computed<FeatureContribution | null>(
        () => features().find((feature) => feature.featureId === activeFeatureId()) ?? null,
      ),
      features,
      hasFeatures: computed(() => features().length > 0),
    };
  }),
  withMethods((store) => ({
    select(featureId: FeatureId | null): void {
      patchState(store, { activeFeatureId: featureId });
    },
  })),
);
