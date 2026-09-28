import type { EntityTableData } from '@zmt/renderer/plugin/util';

import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { collectUnhandledErrors, NotImplementedError } from '@zmt/renderer/pending/util';

import { EntityTableStore } from './entity-table.store';

const DATA: EntityTableData = {
  actions: [
    {
      execute: () => Promise.resolve({ kind: 'none' }),
      id: 'edit',
      isAvailable: ({ selectedRowId }) => selectedRowId !== null,
      label: 'Edit',
    },
  ],
  columns: [{ id: 'name', label: 'Name', sortable: true }],
  defaultSort: [{ columnId: 'name', direction: 'asc' }],
  rows: [
    { cells: { name: 'b' }, id: 'b', state: 'normal' },
    { cells: { name: 'a' }, id: 'a', state: 'normal' },
  ],
};

describe('EntityTableStore', () => {
  let store: InstanceType<typeof EntityTableStore>;

  beforeEach(() => {
    store = TestBed.inject(EntityTableStore);
  });

  it('starts without data, selection or actions', () => {
    expect(store.data()).toBeNull();
    expect(store.filePath()).toBeNull();
    expect(store.selectedRowId()).toBeNull();
    expect(store.writable()).toBe(false);
    expect(store.status()).toEqual({ kind: 'idle' });
    expect(store.columns()).toEqual([]);
    expect(store.sortedRows()).toEqual([]);
    expect(store.actionViews()).toEqual([]);
  });

  it('derives sorted rows, columns and action availability from the loaded data', () => {
    patchState(unprotected(store), { data: DATA, filePath: '/mod/a.txt', writable: true });
    expect(store.columns()).toEqual(DATA.columns);
    expect(store.sortedRows().map((row) => row.id)).toEqual(['a', 'b']);
    expect(store.actionViews()).toEqual([{ available: false, id: 'edit', label: 'Edit' }]);
    patchState(unprotected(store), { selectedRowId: 'a' });
    expect(store.actionViews()).toEqual([{ available: true, id: 'edit', label: 'Edit' }]);
  });

  it('declares load and runAction as pending loaders', async () => {
    const loadErrors = await collectUnhandledErrors(() => {
      store.load({ filePath: '/mod/a.txt', recognizerId: 'hoi4-technology' });
    });
    expect(loadErrors).toEqual([expect.any(NotImplementedError)]);
    const actionErrors = await collectUnhandledErrors(() => {
      store.runAction('edit');
    });
    expect(actionErrors).toEqual([expect.any(NotImplementedError)]);
  });

  it('declares selectRow and reload as pending', () => {
    expect(() => {
      store.selectRow('a');
    }).toThrow(NotImplementedError);
    expect(() => {
      store.reload();
    }).toThrow(NotImplementedError);
  });
});
