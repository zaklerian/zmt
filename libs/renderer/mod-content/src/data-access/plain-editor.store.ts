import type { IpcChannelResult, IpcFail } from '@zmt/contracts';

import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { fail, IPC_ERROR_CODES } from '@zmt/contracts';
import {
  ASYNC_IDLE,
  ASYNC_LOADING,
  ASYNC_SUCCESS,
  asyncError,
  type AsyncStatus,
  settle,
} from '@zmt/renderer/core';
import { concatMap, from, map, type Observable, of, pipe, Subject, switchMap, tap } from 'rxjs';

import { ModContentService } from './mod-content.service';

export interface PlainEditorState {
  readonly filePath: null | string;
  readonly originalText: string;
  readonly saveStatus: AsyncStatus;
  readonly status: AsyncStatus;
  readonly text: string;
}

export type TextSaveResult = IpcChannelResult<'fs:writeTextFile'>;

interface WriteEvent {
  readonly path: null | string;
  readonly result: TextSaveResult;
  readonly text: string;
}

export const NO_FILE_LOADED: IpcFail = fail(
  IPC_ERROR_CODES.badRequest,
  'A file must be loaded before it can be saved.',
);

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
  withProps(() => {
    const saveResults = new Subject<TextSaveResult>();
    return { _saveResults: saveResults, saveResult$: saveResults.asObservable() };
  }),
  withMethods((store, service = inject(ModContentService)) => {
    const applyRead = (result: IpcChannelResult<'fs:readTextFile'>): void => {
      settle(result, {
        failure: (error) => {
          patchState(store, { status: asyncError(error) });
        },
        success: (text) => {
          patchState(store, { originalText: text, status: ASYNC_SUCCESS, text });
        },
      });
    };

    const write = (): Observable<WriteEvent> => {
      const path = store.filePath();
      const text = store.text();
      if (path === null) {
        return of({ path, result: NO_FILE_LOADED, text });
      }
      patchState(store, { saveStatus: ASYNC_LOADING });
      return from(service.writeTextFile({ content: text, path })).pipe(
        map((result) => ({ path, result, text })),
      );
    };

    const applyWrite = ({ path, result, text }: WriteEvent): void => {
      if (path !== store.filePath()) {
        return;
      }
      settle(result, {
        failure: (error) => {
          patchState(store, { saveStatus: asyncError(error) });
        },
        success: () => {
          patchState(store, { originalText: text, saveStatus: ASYNC_SUCCESS });
        },
      });
      store._saveResults.next(result);
    };

    const reset = (): void => {
      patchState(store, (state) => ({ saveStatus: ASYNC_IDLE, text: state.originalText }));
    };

    const updateText = (text: string): void => {
      patchState(store, { text });
    };

    return {
      load: rxMethod<string>(
        pipe(
          tap((filePath) => {
            patchState(store, {
              filePath,
              originalText: '',
              saveStatus: ASYNC_IDLE,
              status: ASYNC_LOADING,
              text: '',
            });
          }),
          switchMap((filePath) => from(service.readTextFile({ path: filePath }))),
          tap(applyRead),
        ),
      ),
      reset,
      save: rxMethod((source$: Observable<void>) =>
        source$.pipe(concatMap(write), tap(applyWrite)),
      ),
      updateText,
    };
  }),
);
