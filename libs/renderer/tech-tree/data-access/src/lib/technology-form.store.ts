import type {
  EntityFormMode,
  EntityFormModel,
  EntityFormValues,
} from '@zmt/renderer/entity-form/util';
import type { TechnologyFlowStatus, TechTreePoint } from '@zmt/renderer/tech-tree/util';

import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pending } from '@zmt/renderer/pending/util';
import { pipe, tap } from 'rxjs';

export interface TechnologyFormState {
  readonly mode: EntityFormMode | null;
  readonly model: EntityFormModel | null;
  readonly status: TechnologyFlowStatus;
}

const INITIAL_STATE: TechnologyFormState = {
  mode: null,
  model: null,
  status: { kind: 'idle' },
};

export const TechnologyFormStore = signalStore(
  { providedIn: 'root' },
  withState(INITIAL_STATE),
  withComputed(({ model, status }) => ({
    busy: computed(() => status().kind === 'loading'),
    isOpen: computed(() => model() !== null),
  })),
  withMethods((store) => {
    const close = (): void => {
      patchState(store, { mode: null, model: null, status: { kind: 'idle' } });
    };
    return {
      close,
      openAddChild: rxMethod<string>(pipe(tap(() => pending('ZMT-A-5')))),
      openAddFree: rxMethod<TechTreePoint>(pipe(tap(() => pending('ZMT-A-5')))),
      openEdit: rxMethod<string>(pipe(tap(() => pending('ZMT-A-5')))),
      save: rxMethod<EntityFormValues>(pipe(tap(() => pending('ZMT-A-5')))),
    };
  }),
);
