import type { FeatureContribution, FeatureId } from '@zmt/contracts';

import { computed } from '@angular/core';
import { signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { ASYNC_IDLE, type AsyncStatus } from '@zmt/renderer/async-status/util';
import { pending } from '@zmt/renderer/pending/util';
import { type Observable, tap } from 'rxjs';

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

export const FeatureNavStore = signalStore(
  { providedIn: 'root' },
  withState(INITIAL_STATE),
  withComputed(({ activeFeatureId, features }) => ({
    activeFeature: computed<FeatureContribution | null>(
      () => features().find((feature) => feature.featureId === activeFeatureId()) ?? null,
    ),
    hasFeatures: computed(() => features().length > 0),
  })),
  withMethods(() => {
    const select: (featureId: FeatureId | null) => void = () => pending('ZMT-A-5');
    return {
      load: rxMethod((source$: Observable<void>) => source$.pipe(tap(() => pending('ZMT-A-5')))),
      select,
    };
  }),
);
