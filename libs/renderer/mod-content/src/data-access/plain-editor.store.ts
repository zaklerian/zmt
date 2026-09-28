import type { IpcChannelResult } from '@zmt/contracts';

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
import { from, map, merge, type Observable, Subject, switchMap, tap } from 'rxjs';

import { ModContentService } from './mod-content.service';

export interface PlainEditorState {
  readonly filePath: null | string;
  readonly originalText: string;
  readonly saveStatus: AsyncStatus;
  readonly status: AsyncStatus;
  readonly text: string;
}

type EditorEvent =
  | { readonly kind: 'read'; readonly result: IpcChannelResult<'fs:readTextFile'> }
  | {
      readonly kind: 'written';
      readonly result: IpcChannelResult<'fs:writeTextFile'>;
      readonly text: string;
    };

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
  withMethods((store, service = inject(ModContentService)) => {
    const saveRequests = new Subject<void>();

    const read = (path: string): Observable<EditorEvent> =>
      from(service.readTextFile({ path })).pipe(map((result) => ({ kind: 'read', result })));

    const write = (path: string): Observable<EditorEvent> => {
      const text = store.text();
      patchState(store, { saveStatus: ASYNC_LOADING });
      return from(service.writeTextFile({ content: text, path })).pipe(
        map((result) => ({ kind: 'written', result, text })),
      );
    };

    const apply = (event: EditorEvent): void => {
      switch (event.kind) {
        case 'read':
          settle(event.result, {
            failure: (error) => {
              patchState(store, { status: asyncError(error) });
            },
            success: (text) => {
              patchState(store, { originalText: text, status: ASYNC_SUCCESS, text });
            },
          });
          return;
        case 'written':
          settle(event.result, {
            failure: (error) => {
              patchState(store, { saveStatus: asyncError(error) });
            },
            success: () => {
              patchState(store, { originalText: event.text, saveStatus: ASYNC_SUCCESS });
            },
          });
          return;
        default:
          return event satisfies never;
      }
    };

    const reset = (): void => {
      patchState(store, (state) => ({ saveStatus: ASYNC_IDLE, text: state.originalText }));
    };

    const updateText = (text: string): void => {
      patchState(store, { text });
    };

    return {
      load: rxMethod<string>((source$) =>
        source$.pipe(
          tap((filePath) => {
            patchState(store, {
              filePath,
              originalText: '',
              saveStatus: ASYNC_IDLE,
              status: ASYNC_LOADING,
              text: '',
            });
          }),
          switchMap((filePath) =>
            merge(read(filePath), saveRequests.pipe(switchMap(() => write(filePath)))),
          ),
          tap(apply),
        ),
      ),
      reset,
      save: rxMethod((source$: Observable<void>) =>
        source$.pipe(
          tap(() => {
            saveRequests.next();
          }),
        ),
      ),
      updateText,
    };
  }),
);
