import type { FeatureContribution, FeatureId, GamePlugin } from '@zmt/contracts';
import type { FeatureToggles } from '@zmt/renderer/app-settings/util';

import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { AppSettingsStore } from '@zmt/renderer/app-settings/data-access';
import { isFeatureEnabled } from '@zmt/renderer/app-settings/util';
import {
  ASYNC_IDLE,
  ASYNC_LOADING,
  ASYNC_SUCCESS,
  asyncError,
  type AsyncStatus,
  settle,
} from '@zmt/renderer/async-status/util';
import { PluginService } from '@zmt/renderer/plugin/data-access';
import { from, type Observable, switchMap, tap } from 'rxjs';

export interface FeatureNavState {
  readonly activeFeatureId: FeatureId | null;
  readonly features: readonly FeatureContribution[];
  readonly status: AsyncStatus;
}

const INITIAL_STATE: FeatureNavState = {
  activeFeatureId: null,
  features: [],
  status: ASYNC_IDLE,
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
  withComputed(({ activeFeatureId, features }) => ({
    activeFeature: computed<FeatureContribution | null>(
      () => features().find((feature) => feature.featureId === activeFeatureId()) ?? null,
    ),
    hasFeatures: computed(() => features().length > 0),
  })),
  withMethods((store, service = inject(PluginService), settings = inject(AppSettingsStore)) => {
    const select = (featureId: FeatureId | null): void => {
      patchState(store, { activeFeatureId: featureId });
    };
    return {
      load: rxMethod((source$: Observable<void>) =>
        source$.pipe(
          tap(() => {
            patchState(store, { status: ASYNC_LOADING });
          }),
          switchMap(() => from(service.list())),
          tap((result) => {
            settle(result, {
              failure: (error) => {
                patchState(store, { features: [], status: asyncError(error) });
              },
              success: (plugins) => {
                patchState(store, {
                  features: enabledFeatures(plugins, settings.featureToggles()),
                  status: ASYNC_SUCCESS,
                });
              },
            });
          }),
        ),
      ),
      select,
    };
  }),
);
