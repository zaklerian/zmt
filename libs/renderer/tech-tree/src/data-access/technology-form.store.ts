import { computed } from '@angular/core';
import { signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pending } from '@zmt/renderer/core';
import { pipe, tap } from 'rxjs';

import type { TechnologyFlowStatus, TechTreePoint } from '../util';

export interface TechnologyFormState {
  readonly status: TechnologyFlowStatus;
}

const INITIAL_STATE: TechnologyFormState = {
  status: { kind: 'idle' },
};

export const TechnologyFormStore = signalStore(
  { providedIn: 'root' },
  withState(INITIAL_STATE),
  withComputed(({ status }) => ({
    busy: computed(() => status().kind === 'loading'),
  })),
  withMethods(() => ({
    openAddChild: rxMethod<string>(pipe(tap(() => pending('ZMT-A-5')))),
    openAddFree: rxMethod<TechTreePoint>(pipe(tap(() => pending('ZMT-A-5')))),
    openEdit: rxMethod<string>(pipe(tap(() => pending('ZMT-A-5')))),
  })),
);
