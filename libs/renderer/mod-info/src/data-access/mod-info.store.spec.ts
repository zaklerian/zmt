import type { IpcChannelResult } from '@zmt/contracts';

import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { fail, ok } from '@zmt/contracts';
import { deferred, flushPromises } from '@zmt/renderer/core';

import type { ModDescriptorValues } from '../util';

import { ModInfoService } from './mod-info.service';
import { ModInfoStore } from './mod-info.store';

type ReadResult = IpcChannelResult<'fs:readTextFile'>;
type WriteResult = IpcChannelResult<'fs:writeTextFile'>;

const SOURCE =
  'name="My mod"\nversion="0.1"\ntags={\n\t"Gameplay"\n}\nsupported_version="1.14.*"\n';

const VALUES: ModDescriptorValues = {
  name: 'My mod',
  path: '',
  picture: '',
  supportedVersion: '1.14.*',
  tags: ['Gameplay'],
  version: '0.1',
};

const PATH = '/mods/my-mod/descriptor.mod';

describe('ModInfoStore', () => {
  let store: InstanceType<typeof ModInfoStore>;
  const readDescriptor = vi.fn<(path: string) => Promise<ReadResult>>();
  const writeDescriptor = vi.fn<(path: string, content: string) => Promise<WriteResult>>();

  beforeEach(() => {
    readDescriptor.mockReset();
    writeDescriptor.mockReset();
    TestBed.configureTestingModule({
      providers: [{ provide: ModInfoService, useValue: { readDescriptor, writeDescriptor } }],
    });
    store = TestBed.inject(ModInfoStore);
  });

  it('starts without a descriptor', () => {
    expect(store.descriptorPath()).toBeNull();
    expect(store.values()).toBeNull();
    expect(store.source()).toBe('');
    expect(store.parserWarnings()).toEqual([]);
    expect(store.status()).toEqual({ kind: 'idle' });
    expect(store.saveStatus()).toEqual({ kind: 'idle' });
    expect(store.hasDescriptor()).toBe(false);
    expect(store.saving()).toBe(false);
    expect(store.warningCount()).toBe(0);
  });

  it('derives presence, saving and the warning count from state', () => {
    patchState(unprotected(store), {
      parserWarnings: [{ from: 1, message: 'unexpected token', to: 4 }],
      saveStatus: { kind: 'loading' },
      values: VALUES,
    });
    expect(store.hasDescriptor()).toBe(true);
    expect(store.saving()).toBe(true);
    expect(store.warningCount()).toBe(1);
  });

  it('loads and parses the descriptor into values and warnings', async () => {
    const read = deferred<ReadResult>();
    readDescriptor.mockReturnValue(read.promise);
    store.load(PATH);
    expect(store.descriptorPath()).toBe(PATH);
    expect(store.status()).toEqual({ kind: 'loading' });
    expect(readDescriptor).toHaveBeenCalledWith(PATH);
    read.resolve(ok(`${SOURCE}broken\n`));
    await flushPromises();
    expect(store.status()).toEqual({ kind: 'success' });
    expect(store.values()).toEqual(VALUES);
    expect(store.source()).toBe(`${SOURCE}broken\n`);
    expect(store.parserWarnings()).toEqual([
      { from: SOURCE.length, message: 'Expected "=" after "broken"', to: SOURCE.length + 6 },
    ]);
  });

  it.each([400, 403, 404, 409, 413, 500] as const)('reports a %i read failure', async (code) => {
    readDescriptor.mockResolvedValue(fail(code, 'unreadable'));
    store.load(PATH);
    await flushPromises();
    expect(store.status()).toEqual({ error: { code, message: 'unreadable' }, kind: 'error' });
    expect(store.values()).toBeNull();
  });

  it('drops the read of a superseded descriptor so stale values never land', async () => {
    const first = deferred<ReadResult>();
    const second = deferred<ReadResult>();
    readDescriptor.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    store.load('/mods/a/descriptor.mod');
    store.load('/mods/b/descriptor.mod');
    second.resolve(ok('name="b"\n'));
    await flushPromises();
    first.resolve(ok('name="a"\n'));
    await flushPromises();
    expect(store.descriptorPath()).toBe('/mods/b/descriptor.mod');
    expect(store.values()?.name).toBe('b');
  });

  it('serializes the edited values over the source, writes and reparses', async () => {
    readDescriptor.mockResolvedValue(ok(SOURCE));
    store.load(PATH);
    await flushPromises();
    const write = deferred<WriteResult>();
    writeDescriptor.mockReturnValue(write.promise);
    store.save({ ...VALUES, tags: ['Gameplay', 'Historical'], version: '0.2' });
    expect(store.saveStatus()).toEqual({ kind: 'loading' });
    const expected = SOURCE.replace('version="0.1"', 'version="0.2"').replace(
      '\t"Gameplay"\n',
      '\t"Gameplay"\n\t"Historical"\n',
    );
    expect(writeDescriptor).toHaveBeenCalledWith(PATH, expected);
    write.resolve(ok(null));
    await flushPromises();
    expect(store.saveStatus()).toEqual({ kind: 'success' });
    expect(store.source()).toBe(expected);
    expect(store.values()).toEqual({
      ...VALUES,
      tags: ['Gameplay', 'Historical'],
      version: '0.2',
    });
  });

  it.each([400, 403, 404, 409, 413, 500] as const)(
    'keeps the loaded values and reports a %i save failure',
    async (code) => {
      readDescriptor.mockResolvedValue(ok(SOURCE));
      writeDescriptor.mockResolvedValue(fail(code, 'locked'));
      store.load(PATH);
      await flushPromises();
      store.save({ ...VALUES, version: '0.2' });
      await flushPromises();
      expect(store.saveStatus()).toEqual({ error: { code, message: 'locked' }, kind: 'error' });
      expect(store.values()).toEqual(VALUES);
      expect(store.source()).toBe(SOURCE);
    },
  );

  it('ignores a save without a loaded descriptor and cancels a save when another loads', async () => {
    store.save(VALUES);
    await flushPromises();
    expect(writeDescriptor).not.toHaveBeenCalled();

    readDescriptor.mockResolvedValueOnce(ok(SOURCE)).mockResolvedValueOnce(ok('name="other"\n'));
    store.load(PATH);
    await flushPromises();
    const write = deferred<WriteResult>();
    writeDescriptor.mockReturnValue(write.promise);
    store.save({ ...VALUES, version: '9' });
    store.load('/mods/other/descriptor.mod');
    await flushPromises();
    write.resolve(ok(null));
    await flushPromises();
    expect(store.values()?.name).toBe('other');
    expect(store.saveStatus()).toEqual({ kind: 'idle' });
  });
});
