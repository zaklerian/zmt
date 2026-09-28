import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  ASYNC_IDLE,
  ASYNC_LOADING,
  ASYNC_SUCCESS,
  asyncError,
  type AsyncStatus,
  settle,
} from '@zmt/renderer/async-status/util';
import { from, type Observable, switchMap, tap } from 'rxjs';

import { WorkspaceService } from './workspace.service';

export interface WorkspaceState {
  readonly root: null | string;
  readonly status: AsyncStatus;
}

const INITIAL_STATE: WorkspaceState = {
  root: null,
  status: ASYNC_IDLE,
};

export function basename(path: string): string {
  const parts = path.split(/[/\\]/u).filter((part) => part.length > 0);
  return parts.at(-1) ?? path;
}

export const WorkspaceStore = signalStore(
  { providedIn: 'root' },
  withState(INITIAL_STATE),
  withComputed(({ root }) => ({
    hasRoot: computed(() => root() !== null),
    rootName: computed(() => {
      const current = root();
      return current === null ? null : basename(current);
    }),
  })),
  withMethods((store, service = inject(WorkspaceService)) => {
    const closeFolder = (): void => {
      patchState(store, { root: null, status: ASYNC_IDLE });
    };
    return {
      closeFolder,
      openFolder: rxMethod((source$: Observable<void>) =>
        source$.pipe(
          tap(() => {
            patchState(store, { status: ASYNC_LOADING });
          }),
          switchMap(() => from(service.openFolderDialog())),
          tap((result) => {
            settle(result, {
              failure: (error) => {
                patchState(store, { status: asyncError(error) });
              },
              success: (chosen) => {
                patchState(
                  store,
                  chosen === null
                    ? { status: ASYNC_IDLE }
                    : { root: chosen, status: ASYNC_SUCCESS },
                );
              },
            });
          }),
        ),
      ),
    };
  }),
);
