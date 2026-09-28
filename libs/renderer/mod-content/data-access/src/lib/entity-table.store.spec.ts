import type { IpcResult } from '@zmt/contracts';
import type { EntityFormModel, EntityFormValues } from '@zmt/renderer/entity-form/util';
import type {
  EntityActionContext,
  EntityActionEffect,
  EntityTableData,
  RendererPlugin,
} from '@zmt/renderer/plugin/util';

import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { fail, ok } from '@zmt/contracts';
import { deferred, flushPromises } from '@zmt/renderer/async-status/util';
import { DialogService } from '@zmt/renderer/dialog/util';
import { I18nStore } from '@zmt/renderer/i18n/data-access';
import { PluginRegistryStore } from '@zmt/renderer/plugin/data-access';
import { WorkspaceStore } from '@zmt/renderer/workspace/data-access';
import { EN_MESSAGES, LOCALE } from '@zmt/shared/i18n';
import { of } from 'rxjs';

import { EntityTableStore, messageOf } from './entity-table.store';

const execute = vi.fn<(context: EntityActionContext) => Promise<EntityActionEffect>>();

const DATA: EntityTableData = {
  actions: [
    {
      execute,
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

const REQUEST = { filePath: '/mod/common/technologies/air.txt', recognizerId: 'test-entity' };

const load = vi.fn<() => Promise<IpcResult<EntityTableData>>>();

const PLUGIN: RendererPlugin = {
  formDescriptors: [],
  gameId: 'hoi4',
  recognizers: [{ id: 'test-entity', load, matches: () => true }],
};

const save = vi.fn<(values: EntityFormValues) => Promise<IpcResult<EntityFormValues | null>>>();

const FORM: EntityFormModel = {
  blocks: [],
  errorMessage: (code) => `failed with ${String(code)}`,
  errorTitle: 'Save failed',
  save,
};

describe('EntityTableStore', () => {
  let store: InstanceType<typeof EntityTableStore>;
  const confirm = vi.fn();
  const info = vi.fn();

  beforeEach(() => {
    load.mockReset();
    execute.mockReset();
    save.mockReset();
    confirm.mockReset().mockReturnValue(of(true));
    info.mockReset().mockReturnValue(of(undefined));
    TestBed.configureTestingModule({
      providers: [{ provide: DialogService, useValue: { confirm, info } }],
    });
    patchState(unprotected(TestBed.inject(PluginRegistryStore)), { plugins: [PLUGIN] });
    patchState(unprotected(TestBed.inject(WorkspaceStore)), { root: '/mod' });
    store = TestBed.inject(EntityTableStore);
  });

  it('starts without data, selection or actions', () => {
    expect(store.data()).toBeNull();
    expect(store.filePath()).toBeNull();
    expect(store.selectedRowId()).toBeNull();
    expect(store.writable()).toBe(false);
    expect(store.status()).toEqual({ kind: 'idle' });
    expect(store.actionStatus()).toEqual({ kind: 'idle' });
    expect(store.form()).toBeNull();
    expect(store.formStatus()).toEqual({ kind: 'idle' });
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

  it('loads the table through the recognizer with the active messages', async () => {
    const pending = deferred<IpcResult<EntityTableData>>();
    load.mockReturnValue(pending.promise);
    store.load(REQUEST);
    expect(store.status()).toEqual({ kind: 'loading' });
    expect(store.filePath()).toBe(REQUEST.filePath);
    expect(store.writable()).toBe(true);
    expect(load).toHaveBeenCalledWith(REQUEST.filePath, EN_MESSAGES);
    pending.resolve(ok(DATA));
    await flushPromises();
    expect(store.status()).toEqual({ kind: 'success' });
    expect(store.data()).toBe(DATA);
  });

  it.each([400, 403, 404, 409, 413, 500] as const)('reports a %i load failure', async (code) => {
    load.mockResolvedValue(fail(code, 'boom'));
    store.load(REQUEST);
    await flushPromises();
    expect(store.status()).toEqual({ error: { code, message: 'boom' }, kind: 'error' });
    expect(store.data()).toBeNull();
  });

  it('maps a throwing or rejecting recognizer to an internal failure', async () => {
    load.mockImplementationOnce(() => {
      throw new Error('not yet');
    });
    store.load(REQUEST);
    await flushPromises();
    expect(store.status()).toEqual({ error: { code: 500, message: 'not yet' }, kind: 'error' });
    load.mockRejectedValueOnce('later');
    store.load(REQUEST);
    await flushPromises();
    expect(store.status()).toEqual({ error: { code: 500, message: 'later' }, kind: 'error' });
    expect(messageOf(new Error('x'))).toBe('x');
    expect(messageOf(42)).toBe('42');
  });

  it('reports an unknown recognizer as not found', async () => {
    store.load({ ...REQUEST, recognizerId: 'missing' });
    await flushPromises();
    expect(store.status()).toEqual({
      error: { code: 404, message: 'No recognizer is registered for missing' },
      kind: 'error',
    });
  });

  it('drops the load of a superseded file so stale rows never land', async () => {
    const first = deferred<IpcResult<EntityTableData>>();
    const second = deferred<IpcResult<EntityTableData>>();
    load.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    store.load(REQUEST);
    store.selectRow('a');
    store.load({ ...REQUEST, filePath: '/mod/other.txt' });
    expect(store.selectedRowId()).toBeNull();
    second.resolve(ok({ ...DATA, rows: [] }));
    await flushPromises();
    first.resolve(ok(DATA));
    await flushPromises();
    expect(store.filePath()).toBe('/mod/other.txt');
    expect(store.sortedRows()).toEqual([]);
  });

  it('reloads on demand and when the locale changes', async () => {
    load.mockResolvedValue(ok(DATA));
    store.load(REQUEST);
    await flushPromises();
    store.reload();
    await flushPromises();
    expect(load).toHaveBeenCalledTimes(2);

    const i18n = TestBed.inject(I18nStore);
    i18n.setLocale(LOCALE.de);
    await vi.waitFor(() => {
      expect(i18n.locale()).toBe(LOCALE.de);
    });
    TestBed.tick();
    await flushPromises();
    expect(load).toHaveBeenCalledTimes(3);
    expect(load).toHaveBeenLastCalledWith(REQUEST.filePath, i18n.messages());
  });

  it('runs an action with the table context and applies its effect', async () => {
    load.mockResolvedValue(ok(DATA));
    store.load(REQUEST);
    await flushPromises();
    store.selectRow('a');

    execute.mockResolvedValueOnce({ kind: 'none' });
    store.runAction('edit');
    await flushPromises();
    expect(store.actionStatus()).toEqual({ kind: 'success' });
    const context = execute.mock.calls[0]?.[0];
    expect(context).toMatchObject({
      filePath: REQUEST.filePath,
      messages: EN_MESSAGES,
      selectedRowId: 'a',
      writable: true,
    });
    await expect(
      context?.confirm({ cancelLabel: 'c', confirmLabel: 'o', message: 'm', title: 't' }),
    ).resolves.toBe(true);
    expect(confirm).toHaveBeenCalledWith({
      cancelLabel: 'c',
      confirmLabel: 'o',
      message: 'm',
      title: 't',
    });

    execute.mockResolvedValueOnce({ kind: 'refresh' });
    store.runAction('edit');
    await flushPromises();
    expect(load).toHaveBeenCalledTimes(2);

    execute.mockResolvedValueOnce({ form: FORM, kind: 'openForm' });
    store.runAction('edit');
    await flushPromises();
    expect(store.form()).toBe(FORM);
    store.closeForm();
    expect(store.form()).toBeNull();
  });

  it('reports a failing or unknown action without touching the table', async () => {
    load.mockResolvedValue(ok(DATA));
    store.load(REQUEST);
    await flushPromises();
    execute.mockRejectedValueOnce(new Error('denied'));
    store.runAction('edit');
    await flushPromises();
    expect(store.actionStatus()).toEqual({
      error: { code: 500, message: 'denied' },
      kind: 'error',
    });
    expect(store.data()).toBe(DATA);
    store.runAction('missing');
    await flushPromises();
    expect(store.actionStatus()).toEqual({
      error: { code: 404, message: 'No action is registered for missing' },
      kind: 'error',
    });
  });

  it('submits the open form, closes it and reloads on success', async () => {
    load.mockResolvedValue(ok(DATA));
    store.load(REQUEST);
    await flushPromises();
    patchState(unprotected(store), { form: FORM });
    const saving = deferred<IpcResult<EntityFormValues | null>>();
    save.mockReturnValue(saving.promise);
    store.submitForm({ name: 'x' });
    expect(store.formStatus()).toEqual({ kind: 'loading' });
    expect(save).toHaveBeenCalledWith({ name: 'x' });
    saving.resolve(ok(null));
    await flushPromises();
    expect(store.form()).toBeNull();
    expect(store.formStatus()).toEqual({ kind: 'success' });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it.each([400, 403, 404, 409, 413, 500] as const)(
    'keeps the form open and explains a %i save failure',
    async (code) => {
      load.mockResolvedValue(ok(DATA));
      store.load(REQUEST);
      await flushPromises();
      patchState(unprotected(store), { form: FORM });
      save.mockResolvedValue(fail(code, 'boom'));
      store.submitForm({});
      await flushPromises();
      expect(store.form()).toBe(FORM);
      expect(store.formStatus()).toEqual({ error: { code, message: 'boom' }, kind: 'error' });
      expect(info).toHaveBeenCalledWith({
        confirmLabel: EN_MESSAGES.actions.close,
        message: `failed with ${String(code)}`,
        title: 'Save failed',
      });
    },
  );

  it('rejects a submission while no form is open', async () => {
    load.mockResolvedValue(ok(DATA));
    store.load(REQUEST);
    await flushPromises();
    store.submitForm({});
    await flushPromises();
    expect(store.formStatus()).toEqual({
      error: { code: 404, message: 'No entity form is open' },
      kind: 'error',
    });
    expect(info).not.toHaveBeenCalled();
  });

  it('ignores actions and submissions before a table is loaded', async () => {
    store.runAction('edit');
    store.submitForm({});
    store.reload();
    await flushPromises();
    expect(execute).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
  });
});
