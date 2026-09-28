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

type DescriptorEvent =
  | { readonly kind: 'read'; readonly result: IpcChannelResult<'fs:readTextFile'> }
  | {
      readonly kind: 'written';
      readonly result: IpcChannelResult<'fs:writeTextFile'>;
      readonly text: string;
    };

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
  withMethods((store, service = inject(ModInfoService)) => {
    const saveRequests = new Subject<ModDescriptorValues>();

    const applyText = (text: string): void => {
      const document = parseDescriptor(text);
      patchState(store, {
        parserWarnings: document.warnings,
        source: text,
        status: ASYNC_SUCCESS,
        values: descriptorValues(document),
      });
    };

    const read = (path: string): Observable<DescriptorEvent> =>
      from(service.readDescriptor(path)).pipe(map((result) => ({ kind: 'read', result })));

    const write = (path: string, values: ModDescriptorValues): Observable<DescriptorEvent> => {
      const text = serializeDescriptor(parseDescriptor(store.source()), values);
      patchState(store, { saveStatus: ASYNC_LOADING });
      return from(service.writeDescriptor(path, text)).pipe(
        map((result) => ({ kind: 'written', result, text })),
      );
    };

    const apply = (event: DescriptorEvent): void => {
      switch (event.kind) {
        case 'read':
          settle(event.result, {
            failure: (error) => {
              patchState(store, { status: asyncError(error) });
            },
            success: applyText,
          });
          return;
        case 'written':
          settle(event.result, {
            failure: (error) => {
              patchState(store, { saveStatus: asyncError(error) });
            },
            success: () => {
              applyText(event.text);
              patchState(store, { saveStatus: ASYNC_SUCCESS });
            },
          });
          return;
        default:
          return event satisfies never;
      }
    };

    return {
      load: rxMethod<string>((source$) =>
        source$.pipe(
          tap((descriptorPath) => {
            patchState(store, { ...INITIAL_STATE, descriptorPath, status: ASYNC_LOADING });
          }),
          switchMap((descriptorPath) =>
            merge(
              read(descriptorPath),
              saveRequests.pipe(switchMap((values) => write(descriptorPath, values))),
            ),
          ),
          tap(apply),
        ),
      ),
      save: rxMethod<ModDescriptorValues>(
        tap((values) => {
          saveRequests.next(values);
        }),
      ),
    };
  }),
);
