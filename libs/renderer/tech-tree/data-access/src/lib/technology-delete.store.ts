import type {
  TechnologyDeleteMode,
  TechnologyDeletePlanResult,
  TechnologyDeleteStatus,
} from '@zmt/renderer/tech-tree/util';

import { computed } from '@angular/core';
import { signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pending } from '@zmt/renderer/pending/util';
import { pipe, tap } from 'rxjs';

export interface TechnologyDeleteState {
  readonly plan: TechnologyDeletePlanResult | null;
  readonly status: TechnologyDeleteStatus;
  readonly token: null | string;
}

const INITIAL_STATE: TechnologyDeleteState = {
  plan: null,
  status: { kind: 'idle' },
  token: null,
};

export const TechnologyDeleteStore = signalStore(
  { providedIn: 'root' },
  withState(INITIAL_STATE),
  withComputed(({ plan, status, token }) => ({
    deleting: computed(() => status().kind === 'deleting'),
    hasTree: computed(() => {
      const current = plan();
      return current !== null && current.tree.targets.length > current.item.targets.length;
    }),
    isConfirming: computed(() => plan() !== null && token() !== null),
  })),
  withMethods(() => {
    const cancel: () => void = () => pending('ZMT-A-5');
    return {
      cancel,
      commit: rxMethod<TechnologyDeleteMode>(pipe(tap(() => pending('ZMT-A-5')))),
      open: rxMethod<string>(pipe(tap(() => pending('ZMT-A-5')))),
    };
  }),
);
