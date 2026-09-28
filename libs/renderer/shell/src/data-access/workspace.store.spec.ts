import type { IpcChannelResult } from '@zmt/contracts';

import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { fail, ok } from '@zmt/contracts';
import { deferred, flushPromises } from '@zmt/renderer/core';

import { WorkspaceService } from './workspace.service';
import { basename, WorkspaceStore } from './workspace.store';

type DialogResult = IpcChannelResult<'fs:openFolderDialog'>;

describe('WorkspaceStore', () => {
  let store: InstanceType<typeof WorkspaceStore>;
  const openFolderDialog = vi.fn<() => Promise<DialogResult>>();

  beforeEach(() => {
    openFolderDialog.mockReset();
    TestBed.configureTestingModule({
      providers: [{ provide: WorkspaceService, useValue: { openFolderDialog } }],
    });
    store = TestBed.inject(WorkspaceStore);
  });

  it('starts without a root folder', () => {
    expect(store.root()).toBeNull();
    expect(store.status()).toEqual({ kind: 'idle' });
    expect(store.hasRoot()).toBe(false);
    expect(store.rootName()).toBeNull();
  });

  it('derives the root name from the root path', () => {
    patchState(unprotected(store), { root: '/mods/my-mod' });
    expect(store.hasRoot()).toBe(true);
    expect(store.rootName()).toBe('my-mod');
    expect(basename('C:\\mods\\other\\')).toBe('other');
    expect(basename('')).toBe('');
  });

  it('opens the chosen folder as the root', async () => {
    const dialog = deferred<DialogResult>();
    openFolderDialog.mockReturnValue(dialog.promise);
    store.openFolder();
    expect(store.status()).toEqual({ kind: 'loading' });
    dialog.resolve(ok('/mods/my-mod'));
    await flushPromises();
    expect(store.root()).toBe('/mods/my-mod');
    expect(store.status()).toEqual({ kind: 'success' });
    expect(openFolderDialog).toHaveBeenCalledWith();
  });

  it('keeps the current root when the dialog is cancelled', async () => {
    patchState(unprotected(store), { root: '/mods/my-mod' });
    openFolderDialog.mockResolvedValue(ok(null));
    store.openFolder();
    await flushPromises();
    expect(store.root()).toBe('/mods/my-mod');
    expect(store.status()).toEqual({ kind: 'idle' });
  });

  it.each([400, 403, 404, 409, 413, 500] as const)('reports a %i failure', async (code) => {
    openFolderDialog.mockResolvedValue(fail(code, 'dialog failed'));
    store.openFolder();
    await flushPromises();
    expect(store.root()).toBeNull();
    expect(store.status()).toEqual({ error: { code, message: 'dialog failed' }, kind: 'error' });
  });

  it('lets a newer dialog supersede an older one so the stale choice never lands', async () => {
    const first = deferred<DialogResult>();
    const second = deferred<DialogResult>();
    openFolderDialog.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    store.openFolder();
    store.openFolder();
    second.resolve(ok('/mods/second'));
    await flushPromises();
    first.resolve(ok('/mods/first'));
    await flushPromises();
    expect(store.root()).toBe('/mods/second');
    expect(store.status()).toEqual({ kind: 'success' });
  });

  it('announces an opened folder once and stays silent on cancel and failure', async () => {
    const opened = vi.fn<(root: string) => void>();
    store.folderOpened$.subscribe(opened);
    openFolderDialog
      .mockResolvedValueOnce(ok('/mods/my-mod'))
      .mockResolvedValueOnce(ok(null))
      .mockResolvedValueOnce(fail(500, 'dialog failed'));
    store.openFolder();
    await flushPromises();
    store.openFolder();
    await flushPromises();
    store.openFolder();
    await flushPromises();
    expect(opened.mock.calls).toEqual([['/mods/my-mod']]);
    expect(store.root()).toBe('/mods/my-mod');
  });

  it('closes the folder and returns to idle', () => {
    patchState(unprotected(store), { root: '/mods/my-mod', status: { kind: 'success' } });
    store.closeFolder();
    expect(store.root()).toBeNull();
    expect(store.status()).toEqual({ kind: 'idle' });
  });
});
