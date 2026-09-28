import type { FsNode } from '@zmt/contracts';

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
} from '@zmt/renderer/core';
import { EMPTY, from, switchMap, tap, timer } from 'rxjs';

import { ModContentService } from './mod-content.service';

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

interface ActiveSearch {
  readonly hideUnsupportedFiles: boolean;
  readonly query: string;
  readonly root: string;
}

export const SEARCH_DEBOUNCE_MS = 250;

const INITIAL_STATE: FileSearchState = {
  query: '',
  results: [],
  status: ASYNC_IDLE,
};

const NO_RESULTS: readonly FsNode[] = [];

export function toActiveSearch(request: FileSearchRequest): ActiveSearch | null {
  return request.root === null || request.query.trim() === ''
    ? null
    : { ...request, root: request.root };
}

export const FileSearchStore = signalStore(
  { providedIn: 'root' },
  withState(INITIAL_STATE),
  withComputed(({ query, results }) => ({
    hasResults: computed(() => results().length > 0),
    isIdle: computed(() => query().trim() === ''),
  })),
  withMethods((store, service = inject(ModContentService)) => {
    const clear = (): void => {
      patchState(store, INITIAL_STATE);
    };
    const run = (search: ActiveSearch) =>
      timer(SEARCH_DEBOUNCE_MS).pipe(
        tap(() => {
          patchState(store, { status: ASYNC_LOADING });
        }),
        switchMap(() =>
          from(
            service.searchFiles({
              options: { hideUnsupportedFiles: search.hideUnsupportedFiles },
              query: search.query,
              root: search.root,
            }),
          ),
        ),
      );
    return {
      clear,
      search: rxMethod<FileSearchRequest>((source$) =>
        source$.pipe(
          tap((request) => {
            patchState(
              store,
              toActiveSearch(request) === null
                ? { query: request.query, results: NO_RESULTS, status: ASYNC_IDLE }
                : { query: request.query },
            );
          }),
          switchMap((request) => {
            const search = toActiveSearch(request);
            return search === null ? EMPTY : run(search);
          }),
          tap((result) => {
            settle(result, {
              failure: (error) => {
                patchState(store, { results: NO_RESULTS, status: asyncError(error) });
              },
              success: (nodes) => {
                patchState(store, { results: nodes, status: ASYNC_SUCCESS });
              },
            });
          }),
        ),
      ),
    };
  }),
);
