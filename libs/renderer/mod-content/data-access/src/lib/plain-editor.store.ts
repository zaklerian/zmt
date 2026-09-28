import { computed } from '@angular/core';
import { signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { ASYNC_IDLE, type AsyncStatus } from '@zmt/renderer/async-status/util';
import { pending } from '@zmt/renderer/pending/util';
import { type Observable, pipe, tap } from 'rxjs';

export interface PlainEditorState {
  readonly filePath: null | string;
  readonly originalText: string;
  readonly saveStatus: AsyncStatus;
  readonly status: AsyncStatus;
  readonly text: string;
}

const INITIAL_STATE: PlainEditorState = {
  filePath: null,
  originalText: '',
  saveStatus: ASYNC_IDLE,
  status: ASYNC_IDLE,
  text: '',
};

export const PlainEditorStore = signalStore(
  { providedIn: 'root' },
  withState(INITIAL_STATE),
  withComputed(({ originalText, saveStatus, text }) => ({
    dirty: computed(() => text() !== originalText()),
    saving: computed(() => saveStatus().kind === 'loading'),
  })),
  withMethods(() => {
    const reset: () => void = () => pending('ZMT-A-5');
    const updateText: (text: string) => void = () => pending('ZMT-A-5');
    return {
      load: rxMethod<string>(pipe(tap(() => pending('ZMT-A-5')))),
      reset,
      save: rxMethod((source$: Observable<void>) => source$.pipe(tap(() => pending('ZMT-A-5')))),
      updateText,
    };
  }),
);
