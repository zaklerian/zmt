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

import type { ModDescriptorValues, ParserWarning } from '../util';

import { descriptorValues, parseDescriptor, serializeDescriptor } from '../util';
import { ModInfoService } from './mod-info.service';

export interface ModInfoState {
  readonly descriptorPath: null | string;
  readonly parserWarnings: readonly ParserWarning[];
  readonly saveStatus: AsyncStatus;
  readonly source: string;
  readonly status: AsyncStatus;
  readonly values: ModDescriptorValues | null;
}

export type DescriptorSaveResult = IpcChannelResult<'fs:writeTextFile'>;

interface WriteEvent {
  readonly path: null | string;
  readonly result: DescriptorSaveResult;
  readonly text: string;
}

export const NO_DESCRIPTOR_LOADED: IpcFail = fail(
  IPC_ERROR_CODES.badRequest,
  'A descriptor must be loaded before it can be saved.',
);

const INITIAL_STATE: ModInfoState = {
  descriptorPath: null,
  parserWarnings: [],
  saveStatus: ASYNC_IDLE,
  source: '',
  status: ASYNC_IDLE,
  values: null,
};

export const ModInfoStore = signalStore(
  { providedIn: 'root' },
  withState(INITIAL_STATE),
  withComputed(({ parserWarnings, saveStatus, values }) => ({
    hasDescriptor: computed(() => values() !== null),
    saving: computed(() => saveStatus().kind === 'loading'),
    warningCount: computed(() => parserWarnings().length),
  })),
  withProps(() => {
    const saveResults = new Subject<DescriptorSaveResult>();
    return { _saveResults: saveResults, saveResult$: saveResults.asObservable() };
  }),
  withMethods((store, service = inject(ModInfoService)) => {
    const applyText = (text: string): void => {
      const document = parseDescriptor(text);
      patchState(store, {
        parserWarnings: document.warnings,
        source: text,
        status: ASYNC_SUCCESS,
        values: descriptorValues(document),
      });
    };

    const applyRead = (result: IpcChannelResult<'fs:readTextFile'>): void => {
      settle(result, {
        failure: (error) => {
          patchState(store, { status: asyncError(error) });
        },
        success: applyText,
      });
    };

    const write = (values: ModDescriptorValues): Observable<WriteEvent> => {
      const path = store.descriptorPath();
      const text = serializeDescriptor(parseDescriptor(store.source()), values);
      if (path === null) {
        return of({ path, result: NO_DESCRIPTOR_LOADED, text });
      }
      patchState(store, { saveStatus: ASYNC_LOADING });
      return from(service.writeDescriptor(path, text)).pipe(
        map((result) => ({ path, result, text })),
      );
    };

    const applyWrite = ({ path, result, text }: WriteEvent): void => {
      if (path !== store.descriptorPath()) {
        return;
      }
      settle(result, {
        failure: (error) => {
          patchState(store, { saveStatus: asyncError(error) });
        },
        success: () => {
          applyText(text);
          patchState(store, { saveStatus: ASYNC_SUCCESS });
        },
      });
      store._saveResults.next(result);
    };

    return {
      load: rxMethod<string>(
        pipe(
          tap((descriptorPath) => {
            patchState(store, { ...INITIAL_STATE, descriptorPath, status: ASYNC_LOADING });
          }),
          switchMap((descriptorPath) => from(service.readDescriptor(descriptorPath))),
          tap(applyRead),
        ),
      ),
      save: rxMethod<ModDescriptorValues>(pipe(concatMap(write), tap(applyWrite))),
    };
  }),
);
