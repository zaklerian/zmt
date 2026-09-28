import { computed } from '@angular/core';
import { signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { ASYNC_IDLE, type AsyncStatus } from '@zmt/renderer/async-status/util';
import { pending } from '@zmt/renderer/pending/util';
import { type Observable, tap } from 'rxjs';

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
  withMethods(() => {
    const closeFolder: () => void = () => pending('ZMT-A-5');
    return {
      closeFolder,
      openFolder: rxMethod((source$: Observable<void>) =>
        source$.pipe(tap(() => pending('ZMT-A-5'))),
      ),
    };
  }),
);
