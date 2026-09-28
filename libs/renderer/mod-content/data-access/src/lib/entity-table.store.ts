import type { IpcResult } from '@zmt/contracts';
import type { EntityFormModel, EntityFormValues } from '@zmt/renderer/entity-form/util';
import type { Messages } from '@zmt/shared/i18n';

import { computed, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { fail, IPC_ERROR_CODES } from '@zmt/contracts';
import {
  ASYNC_IDLE,
  ASYNC_LOADING,
  ASYNC_SUCCESS,
  asyncError,
  type AsyncStatus,
  settle,
} from '@zmt/renderer/async-status/util';
import { DialogService } from '@zmt/renderer/dialog/util';
import { I18nStore } from '@zmt/renderer/i18n/data-access';
import { PluginRegistryStore } from '@zmt/renderer/plugin/data-access';
import {
  type EntityActionEffect,
  type EntityActionView,
  type EntityColumn,
  type EntityRecognizer,
  type EntityRow,
  type EntityTableData,
  sortEntityRows,
  toEntityActionViews,
} from '@zmt/renderer/plugin/util';
import { WorkspaceStore } from '@zmt/renderer/workspace/data-access';
import {
  catchError,
  defer,
  distinctUntilChanged,
  exhaustMap,
  firstValueFrom,
  from,
  map,
  merge,
  type Observable,
  of,
  startWith,
  Subject,
  switchMap,
  tap,
} from 'rxjs';

export interface EntityTableState {
  readonly actionStatus: AsyncStatus;
  readonly data: EntityTableData | null;
  readonly filePath: null | string;
  readonly form: EntityFormModel | null;
  readonly formStatus: AsyncStatus;
  readonly selectedRowId: null | string;
  readonly status: AsyncStatus;
  readonly writable: boolean;
}

export interface EntityTableRequest {
  readonly filePath: string;
  readonly recognizerId: string;
}

type TableEvent =
  | { readonly kind: 'acted'; readonly result: IpcResult<EntityActionEffect> }
  | { readonly kind: 'loaded'; readonly result: IpcResult<EntityTableData> }
  | { readonly kind: 'saved'; readonly result: IpcResult<EntityFormValues | null> };

const INITIAL_STATE: EntityTableState = {
  actionStatus: ASYNC_IDLE,
  data: null,
  filePath: null,
  form: null,
  formStatus: ASYNC_IDLE,
  selectedRowId: null,
  status: ASYNC_IDLE,
  writable: false,
};

const NO_COLUMNS: readonly EntityColumn[] = [];
const NO_ROWS: readonly EntityRow[] = [];
const NO_ACTIONS: readonly EntityActionView[] = [];

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function toInternalFailure<TData>(error: unknown): Observable<IpcResult<TData>> {
  return of(fail(IPC_ERROR_CODES.internal, messageOf(error)));
}

export const EntityTableStore = signalStore(
  { providedIn: 'root' },
  withState(INITIAL_STATE),
  withComputed(({ data, filePath, selectedRowId, writable }) => ({
    actionViews: computed<readonly EntityActionView[]>(() => {
      const current = data();
      const path = filePath();
      return current === null || path === null
        ? NO_ACTIONS
        : toEntityActionViews(current.actions, {
            filePath: path,
            selectedRowId: selectedRowId(),
            writable: writable(),
          });
    }),
    columns: computed<readonly EntityColumn[]>(() => data()?.columns ?? NO_COLUMNS),
    sortedRows: computed<readonly EntityRow[]>(() => {
      const current = data();
      return current === null ? NO_ROWS : sortEntityRows(current.rows, current.defaultSort);
    }),
  })),
  withMethods(
    (
      store,
      plugins = inject(PluginRegistryStore),
      i18n = inject(I18nStore),
      dialog = inject(DialogService),
      workspace = inject(WorkspaceStore),
    ) => {
      const reloads = new Subject<void>();
      const actionRequests = new Subject<string>();
      const formSubmissions = new Subject<EntityFormValues>();
      const messages$ = merge(of(i18n.messages()), toObservable(i18n.messages)).pipe(
        distinctUntilChanged(),
      );

      const recognizerOf = (id: string): EntityRecognizer | null =>
        plugins.recognizers().find((recognizer) => recognizer.id === id) ?? null;

      const loadData = (request: EntityTableRequest, messages: Messages): Observable<TableEvent> =>
        defer(() => {
          const recognizer = recognizerOf(request.recognizerId);
          return recognizer === null
            ? of(
                fail(
                  IPC_ERROR_CODES.notFound,
                  `No recognizer is registered for ${request.recognizerId}`,
                ),
              )
            : from(recognizer.load(request.filePath, messages));
        }).pipe(
          catchError((error: unknown) => toInternalFailure<EntityTableData>(error)),
          map((result): TableEvent => ({ kind: 'loaded', result })),
        );

      const runAction = (request: EntityTableRequest, actionId: string): Observable<TableEvent> =>
        defer(() => {
          const action = store.data()?.actions.find((candidate) => candidate.id === actionId);
          if (action === undefined) {
            return of(fail(IPC_ERROR_CODES.notFound, `No action is registered for ${actionId}`));
          }
          patchState(store, { actionStatus: ASYNC_LOADING });
          return from(
            action.execute({
              confirm: (options) => firstValueFrom(dialog.confirm(options)),
              filePath: request.filePath,
              messages: i18n.messages(),
              selectedRowId: store.selectedRowId(),
              writable: store.writable(),
            }),
          ).pipe(map((effect): IpcResult<EntityActionEffect> => ({ data: effect, ok: true })));
        }).pipe(
          catchError((error: unknown) => toInternalFailure<EntityActionEffect>(error)),
          map((result): TableEvent => ({ kind: 'acted', result })),
        );

      const submitForm = (values: EntityFormValues): Observable<TableEvent> =>
        defer(() => {
          const form = store.form();
          if (form === null) {
            return of(fail(IPC_ERROR_CODES.notFound, 'No entity form is open'));
          }
          patchState(store, { formStatus: ASYNC_LOADING });
          return from(form.save(values));
        }).pipe(
          catchError((error: unknown) => toInternalFailure<EntityFormValues | null>(error)),
          map((result): TableEvent => ({ kind: 'saved', result })),
        );

      const applyEffect = (effect: EntityActionEffect): void => {
        switch (effect.kind) {
          case 'none':
            return;
          case 'openForm':
            patchState(store, { form: effect.form, formStatus: ASYNC_IDLE });
            return;
          case 'refresh':
            reloads.next();
            return;
          default:
            return effect satisfies never;
        }
      };

      const apply = (event: TableEvent): void => {
        switch (event.kind) {
          case 'acted':
            settle(event.result, {
              failure: (error) => {
                patchState(store, { actionStatus: asyncError(error) });
              },
              success: (effect) => {
                patchState(store, { actionStatus: ASYNC_SUCCESS });
                applyEffect(effect);
              },
            });
            return;
          case 'loaded':
            settle(event.result, {
              failure: (error) => {
                patchState(store, { data: null, status: asyncError(error) });
              },
              success: (data) => {
                patchState(store, { data, status: ASYNC_SUCCESS });
              },
            });
            return;
          case 'saved':
            settle(event.result, {
              failure: (error) => {
                const form = store.form();
                patchState(store, { formStatus: asyncError(error) });
                if (form !== null) {
                  void firstValueFrom(
                    dialog.info({
                      confirmLabel: i18n.messages().actions.close,
                      message: form.errorMessage(error.code),
                      title: form.errorTitle,
                    }),
                  );
                }
              },
              success: () => {
                patchState(store, { form: null, formStatus: ASYNC_SUCCESS });
                reloads.next();
              },
            });
            return;
          default:
            return event satisfies never;
        }
      };

      const session = (request: EntityTableRequest): Observable<TableEvent> =>
        merge(
          reloads.pipe(
            startWith(undefined),
            switchMap(() => messages$),
            switchMap((messages) => loadData(request, messages)),
          ),
          actionRequests.pipe(exhaustMap((actionId) => runAction(request, actionId))),
          formSubmissions.pipe(exhaustMap((values) => submitForm(values))),
        );

      const closeForm = (): void => {
        patchState(store, { form: null, formStatus: ASYNC_IDLE });
      };

      const reload = (): void => {
        reloads.next();
      };

      const selectRow = (rowId: null | string): void => {
        patchState(store, { selectedRowId: rowId });
      };

      return {
        closeForm,
        load: rxMethod<EntityTableRequest>((source$) =>
          source$.pipe(
            tap(({ filePath }) => {
              patchState(store, {
                ...INITIAL_STATE,
                filePath,
                status: ASYNC_LOADING,
                writable: workspace.hasRoot(),
              });
            }),
            switchMap(session),
            tap(apply),
          ),
        ),
        reload,
        runAction: rxMethod<string>(
          tap((actionId) => {
            actionRequests.next(actionId);
          }),
        ),
        selectRow,
        submitForm: rxMethod<EntityFormValues>(
          tap((values) => {
            formSubmissions.next(values);
          }),
        ),
      };
    },
  ),
);
