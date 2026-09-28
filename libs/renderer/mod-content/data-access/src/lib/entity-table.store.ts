import { computed } from '@angular/core';
import { signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { ASYNC_IDLE, type AsyncStatus } from '@zmt/renderer/async-status/util';
import { pending } from '@zmt/renderer/pending/util';
import {
  type EntityActionView,
  type EntityColumn,
  type EntityRow,
  type EntityTableData,
  sortEntityRows,
  toEntityActionViews,
} from '@zmt/renderer/plugin/util';
import { pipe, tap } from 'rxjs';

export interface EntityTableState {
  readonly data: EntityTableData | null;
  readonly filePath: null | string;
  readonly selectedRowId: null | string;
  readonly status: AsyncStatus;
  readonly writable: boolean;
}

export interface EntityTableRequest {
  readonly filePath: string;
  readonly recognizerId: string;
}

const INITIAL_STATE: EntityTableState = {
  data: null,
  filePath: null,
  selectedRowId: null,
  status: ASYNC_IDLE,
  writable: false,
};

const NO_COLUMNS: readonly EntityColumn[] = [];
const NO_ROWS: readonly EntityRow[] = [];
const NO_ACTIONS: readonly EntityActionView[] = [];

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
  withMethods(() => {
    const reload: () => void = () => pending('ZMT-A-5');
    const selectRow: (rowId: null | string) => void = () => pending('ZMT-A-5');
    return {
      load: rxMethod<EntityTableRequest>(pipe(tap(() => pending('ZMT-A-5')))),
      reload,
      runAction: rxMethod<string>(pipe(tap(() => pending('ZMT-A-5')))),
      selectRow,
    };
  }),
);
