import type { IpcChannelResult, IpcRequest } from '@zmt/contracts';

import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { fail, ok } from '@zmt/contracts';
import { deferred, flushPromises } from '@zmt/renderer/core';

import { ModContentService } from './mod-content.service';
import { NO_FILE_LOADED, PlainEditorStore, type TextSaveResult } from './plain-editor.store';

type ReadResult = IpcChannelResult<'fs:readTextFile'>;
type WriteResult = IpcChannelResult<'fs:writeTextFile'>;

describe('PlainEditorStore', () => {
  let store: InstanceType<typeof PlainEditorStore>;
  const readTextFile = vi.fn<(request: IpcRequest<'fs:readTextFile'>) => Promise<ReadResult>>();
  const writeTextFile = vi.fn<(request: IpcRequest<'fs:writeTextFile'>) => Promise<WriteResult>>();

  beforeEach(() => {
    readTextFile.mockReset();
    writeTextFile.mockReset();
    TestBed.configureTestingModule({
      providers: [{ provide: ModContentService, useValue: { readTextFile, writeTextFile } }],
    });
    store = TestBed.inject(PlainEditorStore);
  });

  it('starts with no file, empty text and idle statuses', () => {
    expect(store.filePath()).toBeNull();
    expect(store.text()).toBe('');
    expect(store.originalText()).toBe('');
    expect(store.status()).toEqual({ kind: 'idle' });
    expect(store.saveStatus()).toEqual({ kind: 'idle' });
    expect(store.dirty()).toBe(false);
    expect(store.saving()).toBe(false);
  });

  it('derives dirtiness from the text diverging from the original', () => {
    patchState(unprotected(store), { originalText: 'a = 1', text: 'a = 1' });
    expect(store.dirty()).toBe(false);
    patchState(unprotected(store), { text: 'a = 2' });
    expect(store.dirty()).toBe(true);
    patchState(unprotected(store), { saveStatus: { kind: 'loading' } });
    expect(store.saving()).toBe(true);
  });

  it('loads a file into the buffer and the original', async () => {
    const read = deferred<ReadResult>();
    readTextFile.mockReturnValue(read.promise);
    store.load('/mod/readme.txt');
    expect(store.filePath()).toBe('/mod/readme.txt');
    expect(store.status()).toEqual({ kind: 'loading' });
    expect(readTextFile).toHaveBeenCalledWith({ path: '/mod/readme.txt' });
    read.resolve(ok('hello'));
    await flushPromises();
    expect(store.text()).toBe('hello');
    expect(store.originalText()).toBe('hello');
    expect(store.status()).toEqual({ kind: 'success' });
    expect(store.dirty()).toBe(false);
  });

  it.each([400, 403, 404, 409, 413, 500] as const)('reports a %i read failure', async (code) => {
    readTextFile.mockResolvedValue(fail(code, 'unreadable'));
    store.load('/mod/readme.txt');
    await flushPromises();
    expect(store.status()).toEqual({ error: { code, message: 'unreadable' }, kind: 'error' });
    expect(store.text()).toBe('');
  });

  it('drops the read of a superseded file so the stale text never lands', async () => {
    const first = deferred<ReadResult>();
    const second = deferred<ReadResult>();
    readTextFile.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    store.load('/mod/a.txt');
    store.load('/mod/b.txt');
    second.resolve(ok('b'));
    await flushPromises();
    first.resolve(ok('a'));
    await flushPromises();
    expect(store.filePath()).toBe('/mod/b.txt');
    expect(store.text()).toBe('b');
  });

  it('tracks edits, discards them on reset and saves the buffer', async () => {
    readTextFile.mockResolvedValue(ok('a = 1'));
    store.load('/mod/a.txt');
    await flushPromises();
    store.updateText('a = 2');
    expect(store.dirty()).toBe(true);
    store.reset();
    expect(store.text()).toBe('a = 1');
    expect(store.dirty()).toBe(false);

    store.updateText('a = 3');
    const write = deferred<WriteResult>();
    writeTextFile.mockReturnValue(write.promise);
    store.save();
    expect(store.saveStatus()).toEqual({ kind: 'loading' });
    expect(store.saving()).toBe(true);
    expect(writeTextFile).toHaveBeenCalledWith({ content: 'a = 3', path: '/mod/a.txt' });
    write.resolve(ok(null));
    await flushPromises();
    expect(store.saveStatus()).toEqual({ kind: 'success' });
    expect(store.originalText()).toBe('a = 3');
    expect(store.dirty()).toBe(false);
  });

  it.each([400, 403, 404, 409, 413, 500] as const)(
    'keeps the edits and reports a %i save failure',
    async (code) => {
      readTextFile.mockResolvedValue(ok('a = 1'));
      writeTextFile.mockResolvedValue(fail(code, 'locked'));
      store.load('/mod/a.txt');
      await flushPromises();
      store.updateText('a = 2');
      store.save();
      await flushPromises();
      expect(store.saveStatus()).toEqual({ error: { code, message: 'locked' }, kind: 'error' });
      expect(store.text()).toBe('a = 2');
      expect(store.originalText()).toBe('a = 1');
      store.reset();
      expect(store.saveStatus()).toEqual({ kind: 'idle' });
    },
  );

  it('rejects a save issued before a file is loaded instead of dropping it', async () => {
    const results = vi.fn<(result: TextSaveResult) => void>();
    store.saveResult$.subscribe(results);
    store.save();
    await flushPromises();
    expect(writeTextFile).not.toHaveBeenCalled();
    expect(store.saveStatus()).toEqual({ error: NO_FILE_LOADED.error, kind: 'error' });
    expect(results.mock.calls).toEqual([[NO_FILE_LOADED]]);
  });

  it('queues a rapid second save behind the first so the buffer ends equal to the last write', async () => {
    readTextFile.mockResolvedValue(ok('a = 1'));
    store.load('/mod/a.txt');
    await flushPromises();
    const results = vi.fn<(result: TextSaveResult) => void>();
    store.saveResult$.subscribe(results);
    const first = deferred<WriteResult>();
    const second = deferred<WriteResult>();
    writeTextFile.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    store.updateText('a = 2');
    store.save();
    store.updateText('a = 3');
    store.save();
    expect(writeTextFile).toHaveBeenCalledTimes(1);
    expect(writeTextFile).toHaveBeenLastCalledWith({ content: 'a = 2', path: '/mod/a.txt' });

    first.resolve(ok(null));
    await flushPromises();
    expect(store.originalText()).toBe('a = 2');
    expect(writeTextFile).toHaveBeenCalledTimes(2);
    expect(writeTextFile).toHaveBeenLastCalledWith({ content: 'a = 3', path: '/mod/a.txt' });
    expect(store.saveStatus()).toEqual({ kind: 'loading' });

    second.resolve(ok(null));
    await flushPromises();
    expect(store.originalText()).toBe('a = 3');
    expect(store.saveStatus()).toEqual({ kind: 'success' });
    expect(store.dirty()).toBe(false);
    expect(results.mock.calls).toEqual([[ok(null)], [ok(null)]]);
  });

  it('lets a write for a file that was left finish without touching the newly loaded file', async () => {
    readTextFile.mockResolvedValueOnce(ok('a')).mockResolvedValueOnce(ok('b'));
    store.load('/mod/a.txt');
    await flushPromises();
    store.updateText('a2');
    const results = vi.fn<(result: TextSaveResult) => void>();
    store.saveResult$.subscribe(results);
    const write = deferred<WriteResult>();
    writeTextFile.mockReturnValue(write.promise);
    store.save();
    store.load('/mod/b.txt');
    await flushPromises();
    expect(store.saveStatus()).toEqual({ kind: 'idle' });
    write.resolve(ok(null));
    await flushPromises();
    expect(writeTextFile).toHaveBeenCalledWith({ content: 'a2', path: '/mod/a.txt' });
    expect(store.filePath()).toBe('/mod/b.txt');
    expect(store.text()).toBe('b');
    expect(store.originalText()).toBe('b');
    expect(store.saveStatus()).toEqual({ kind: 'idle' });
    expect(results).not.toHaveBeenCalled();
  });
});
