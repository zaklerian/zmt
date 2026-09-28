import type { FsNode } from '@zmt/contracts';

import { computed } from '@angular/core';
import { signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { ASYNC_IDLE, type AsyncStatus } from '@zmt/renderer/async-status/util';
import { pending } from '@zmt/renderer/pending/util';
import { pipe, tap } from 'rxjs';

export interface FileSearchState {
  readonly query: string;
  readonly results: readonly FsNode[];
  readonly status: AsyncStatus;
}

export interface FileSearchRequest {
  readonly hideUnsupportedFiles: boolean;
  readonly query: string;
  readonly root: null | string;
}

export const SEARCH_DEBOUNCE_MS = 250;

const INITIAL_STATE: FileSearchState = {
  query: '',
  results: [],
  status: ASYNC_IDLE,
};

export const FileSearchStore = signalStore(
  { providedIn: 'root' },
  withState(INITIAL_STATE),
  withComputed(({ query, results }) => ({
    hasResults: computed(() => results().length > 0),
    isIdle: computed(() => query().trim() === ''),
  })),
  withMethods(() => {
    const clear: () => void = () => pending('ZMT-A-5');
    return {
      clear,
      search: rxMethod<FileSearchRequest>(pipe(tap(() => pending('ZMT-A-5')))),
    };
  }),
);
