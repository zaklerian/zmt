import type { FsNode, IpcChannelResult } from '@zmt/contracts';

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
import { filter, from, map, merge, mergeMap, Subject, switchMap, tap } from 'rxjs';

import { type ChildrenByPath, type ErrorsByPath, toFileTreeItems } from './file-tree-item.util';
import { ModContentService } from './mod-content.service';

export interface FileTreeState {
  readonly childrenByPath: ChildrenByPath;
  readonly errorsByPath: ErrorsByPath;
  readonly expanded: readonly string[];
  readonly hideUnsupportedFiles: boolean;
  readonly root: null | string;
  readonly status: AsyncStatus;
}

export interface LoadRootRequest {
  readonly hideUnsupportedFiles: boolean;
  readonly root: string;
}

interface Listing {
  readonly path: string;
  readonly result: IpcChannelResult<'fs:listDirectory'>;
}

const INITIAL_STATE: FileTreeState = {
  childrenByPath: {},
  errorsByPath: {},
  expanded: [],
  hideUnsupportedFiles: false,
  root: null,
  status: ASYNC_IDLE,
};

const NO_CHILDREN: readonly FsNode[] = [];

export const FileTreeStore = signalStore(
  { providedIn: 'root' },
  withState(INITIAL_STATE),
  withComputed(({ childrenByPath, errorsByPath, root }) => {
    const rootChildren = computed<readonly FsNode[]>(() => {
      const current = root();
      return current === null ? NO_CHILDREN : (childrenByPath()[current] ?? NO_CHILDREN);
    });
    return {
      isEmpty: computed(() => root() !== null && rootChildren().length === 0),
      items: computed(() => toFileTreeItems(root(), childrenByPath(), errorsByPath())),
      rootChildren,
    };
  }),
  withMethods((store, service = inject(ModContentService)) => {
    const childRequests = new Subject<string>();

    const list = (path: string, hideUnsupportedFiles: boolean) =>
      from(service.listDirectory({ options: { hideUnsupportedFiles }, path })).pipe(
        map((result): Listing => ({ path, result })),
      );

    const applyListing = ({ path, result }: Listing): void => {
      settle(result, {
        failure: (error) => {
          patchState(store, (state) => ({
            errorsByPath: { ...state.errorsByPath, [path]: error },
            status: path === state.root ? asyncError(error) : state.status,
          }));
        },
        success: (nodes) => {
          patchState(store, (state) => ({
            childrenByPath: { ...state.childrenByPath, [path]: nodes },
            status: path === state.root ? ASYNC_SUCCESS : state.status,
          }));
        },
      });
    };

    const setExpanded = (paths: readonly string[]): void => {
      patchState(store, { expanded: [...paths] });
    };

    return {
      loadChildren: rxMethod<string>(
        tap((path) => {
          childRequests.next(path);
        }),
      ),
      loadRoot: rxMethod<LoadRootRequest>((source$) =>
        source$.pipe(
          tap(({ hideUnsupportedFiles, root }) => {
            patchState(store, {
              childrenByPath: {},
              errorsByPath: {},
              expanded: [root],
              hideUnsupportedFiles,
              root,
              status: ASYNC_LOADING,
            });
          }),
          switchMap(({ hideUnsupportedFiles, root }) =>
            merge(
              list(root, hideUnsupportedFiles),
              childRequests.pipe(
                filter(
                  (path) =>
                    path !== root &&
                    store.childrenByPath()[path] === undefined &&
                    store.errorsByPath()[path] === undefined,
                ),
                mergeMap((path) => list(path, hideUnsupportedFiles)),
              ),
            ),
          ),
          tap(applyListing),
        ),
      ),
      setExpanded,
    };
  }),
);
