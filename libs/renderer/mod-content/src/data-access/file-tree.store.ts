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
} from '@zmt/renderer/core';
import { filter, from, map, mergeMap, pipe, switchMap, tap } from 'rxjs';

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
  readonly tree: LoadRootRequest;
}

interface ChildRequest {
  readonly path: string;
  readonly tree: LoadRootRequest;
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
    const list = (path: string, tree: LoadRootRequest) =>
      from(
        service.listDirectory({
          options: { hideUnsupportedFiles: tree.hideUnsupportedFiles },
          path,
        }),
      ).pipe(map((result): Listing => ({ path, result, tree })));

    const isCurrentTree = ({ hideUnsupportedFiles, root }: LoadRootRequest): boolean =>
      root === store.root() && hideUnsupportedFiles === store.hideUnsupportedFiles();

    const applyListing = ({ path, result, tree }: Listing): void => {
      if (!isCurrentTree(tree)) {
        return;
      }
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

    const toChildRequest = (path: string): ChildRequest | null => {
      const root = store.root();
      const unlisted =
        store.childrenByPath()[path] === undefined && store.errorsByPath()[path] === undefined;
      return root === null || path === root || !unlisted
        ? null
        : { path, tree: { hideUnsupportedFiles: store.hideUnsupportedFiles(), root } };
    };

    const setExpanded = (paths: readonly string[]): void => {
      patchState(store, { expanded: [...paths] });
    };

    return {
      loadChildren: rxMethod<string>(
        pipe(
          map(toChildRequest),
          filter((request): request is ChildRequest => request !== null),
          mergeMap(({ path, tree }) => list(path, tree)),
          tap(applyListing),
        ),
      ),
      loadRoot: rxMethod<LoadRootRequest>(
        pipe(
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
          switchMap((tree) => list(tree.root, tree)),
          tap(applyListing),
        ),
      ),
      setExpanded,
    };
  }),
);
