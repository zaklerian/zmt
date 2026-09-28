import type { FsNode } from '@zmt/contracts';

import { computed } from '@angular/core';
import { signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { ASYNC_IDLE, type AsyncStatus } from '@zmt/renderer/async-status/util';
import { pending } from '@zmt/renderer/pending/util';
import { pipe, tap } from 'rxjs';

import { type ChildrenByPath, toFileTreeItems } from './file-tree-item.util';

export interface FileTreeState {
  readonly childrenByPath: ChildrenByPath;
  readonly expanded: readonly string[];
  readonly hideUnsupportedFiles: boolean;
  readonly root: null | string;
  readonly status: AsyncStatus;
}

export interface LoadRootRequest {
  readonly hideUnsupportedFiles: boolean;
  readonly root: string;
}

const INITIAL_STATE: FileTreeState = {
  childrenByPath: {},
  expanded: [],
  hideUnsupportedFiles: false,
  root: null,
  status: ASYNC_IDLE,
};

const NO_CHILDREN: readonly FsNode[] = [];

export const FileTreeStore = signalStore(
  { providedIn: 'root' },
  withState(INITIAL_STATE),
  withComputed(({ childrenByPath, root }) => {
    const rootChildren = computed<readonly FsNode[]>(() => {
      const current = root();
      return current === null ? NO_CHILDREN : (childrenByPath()[current] ?? NO_CHILDREN);
    });
    return {
      isEmpty: computed(() => root() !== null && rootChildren().length === 0),
      items: computed(() => toFileTreeItems(root(), childrenByPath())),
      rootChildren,
    };
  }),
  withMethods(() => {
    const setExpanded: (paths: readonly string[]) => void = () => pending('ZMT-A-5');
    return {
      loadChildren: rxMethod<string>(pipe(tap(() => pending('ZMT-A-5')))),
      loadRoot: rxMethod<LoadRootRequest>(pipe(tap(() => pending('ZMT-A-5')))),
      setExpanded,
    };
  }),
);
