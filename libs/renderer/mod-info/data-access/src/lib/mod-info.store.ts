import type { ModDescriptorValues, ParserWarning } from '@zmt/renderer/mod-info/util';

import { computed } from '@angular/core';
import { signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { ASYNC_IDLE, type AsyncStatus } from '@zmt/renderer/async-status/util';
import { pending } from '@zmt/renderer/pending/util';
import { pipe, tap } from 'rxjs';

export interface ModInfoState {
  readonly descriptorPath: null | string;
  readonly parserWarnings: readonly ParserWarning[];
  readonly saveStatus: AsyncStatus;
  readonly status: AsyncStatus;
  readonly values: ModDescriptorValues | null;
}

const INITIAL_STATE: ModInfoState = {
  descriptorPath: null,
  parserWarnings: [],
  saveStatus: ASYNC_IDLE,
  status: ASYNC_IDLE,
  values: null,
};

export const ModInfoStore = signalStore(
  { providedIn: 'root' },
  withState(INITIAL_STATE),
  withComputed(({ parserWarnings, saveStatus, values }) => ({
    hasDescriptor: computed(() => values() !== null),
    saving: computed(() => saveStatus().kind === 'loading'),
    warningCount: computed(() => parserWarnings().length),
  })),
  withMethods(() => ({
    load: rxMethod<string>(pipe(tap(() => pending('ZMT-A-5')))),
    save: rxMethod<ModDescriptorValues>(pipe(tap(() => pending('ZMT-A-5')))),
  })),
);
