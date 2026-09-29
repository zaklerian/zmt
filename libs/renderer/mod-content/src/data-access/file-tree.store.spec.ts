import type { FsNode, IpcChannelResult, IpcRequest } from '@zmt/contracts';

import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { fail, ok } from '@zmt/contracts';
import { deferred, flushPromises } from '@zmt/renderer/core';

import { FileTreeStore } from './file-tree.store';
import { ModContentService } from './mod-content.service';

type ListResult = IpcChannelResult<'fs:listDirectory'>;

const README: FsNode = {
  extension: '.txt',
  hasChildren: false,
  name: 'readme.txt',
  path: '/mod/readme.txt',
  support: 'editable',
  type: 'file',
};

const COMMON: FsNode = {
  extension: null,
  hasChildren: true,
  name: 'common',
  path: '/mod/common',
  support: 'readonly',
  type: 'directory',
};

const AIR: FsNode = {
  ...README,
  name: 'air.txt',
  path: '/mod/common/air.txt',
};

describe('FileTreeStore', () => {
  let store: InstanceType<typeof FileTreeStore>;
  const listDirectory = vi.fn<(request: IpcRequest<'fs:listDirectory'>) => Promise<ListResult>>();

  beforeEach(() => {
    listDirectory.mockReset();
    TestBed.configureTestingModule({
      providers: [{ provide: ModContentService, useValue: { listDirectory } }],
    });
    store = TestBed.inject(FileTreeStore);
  });

  it('starts with no root, no children and nothing expanded', () => {
    expect(store.root()).toBeNull();
    expect(store.childrenByPath()).toEqual({});
    expect(store.errorsByPath()).toEqual({});
    expect(store.expanded()).toEqual([]);
    expect(store.hideUnsupportedFiles()).toBe(false);
    expect(store.status()).toEqual({ kind: 'idle' });
    expect(store.rootChildren()).toEqual([]);
    expect(store.items()).toEqual([]);
    expect(store.isEmpty()).toBe(false);
  });

  it('derives the root children, items and emptiness from the loaded map', () => {
    patchState(unprotected(store), { root: '/mod' });
    expect(store.rootChildren()).toEqual([]);
    expect(store.isEmpty()).toBe(true);
    expect(store.items()).toEqual([
      { children: null, error: null, expandable: true, id: '/mod', label: 'mod', node: null },
    ]);

    patchState(unprotected(store), { childrenByPath: { '/mod': [README] } });
    expect(store.rootChildren()).toEqual([README]);
    expect(store.isEmpty()).toBe(false);
    expect(store.items()[0]?.children).toHaveLength(1);
  });

  it('loads the root listing, expands the root and marks success', async () => {
    const listing = deferred<ListResult>();
    listDirectory.mockReturnValue(listing.promise);
    store.loadRoot({ hideUnsupportedFiles: true, root: '/mod' });
    expect(store.status()).toEqual({ kind: 'loading' });
    expect(store.root()).toBe('/mod');
    expect(store.expanded()).toEqual(['/mod']);
    expect(store.hideUnsupportedFiles()).toBe(true);
    expect(listDirectory).toHaveBeenCalledWith({
      options: { hideUnsupportedFiles: true },
      path: '/mod',
    });
    listing.resolve(ok([COMMON, README]));
    await flushPromises();
    expect(store.status()).toEqual({ kind: 'success' });
    expect(store.rootChildren()).toEqual([COMMON, README]);
    expect(store.items()[0]?.children?.map((item) => item.id)).toEqual([
      '/mod/common',
      '/mod/readme.txt',
    ]);
  });

  it.each([400, 403, 404, 409, 413, 500] as const)(
    'reports a %i failure of the root listing',
    async (code) => {
      listDirectory.mockResolvedValue(fail(code, 'boom'));
      store.loadRoot({ hideUnsupportedFiles: false, root: '/mod' });
      await flushPromises();
      expect(store.status()).toEqual({ error: { code, message: 'boom' }, kind: 'error' });
      expect(store.errorsByPath()).toEqual({ '/mod': { code, message: 'boom' } });
      expect(store.items()[0]?.error).toEqual({ code, message: 'boom' });
    },
  );

  it('loads children lazily once per folder and records a failed folder', async () => {
    listDirectory.mockResolvedValueOnce(ok([COMMON]));
    store.loadRoot({ hideUnsupportedFiles: false, root: '/mod' });
    await flushPromises();

    listDirectory.mockResolvedValueOnce(ok([AIR]));
    store.loadChildren('/mod/common');
    await flushPromises();
    expect(store.childrenByPath()['/mod/common']).toEqual([AIR]);
    expect(store.items()[0]?.children?.[0]?.children?.map((item) => item.label)).toEqual([
      'air.txt',
    ]);
    store.loadChildren('/mod/common');
    store.loadChildren('/mod');
    await flushPromises();
    expect(listDirectory).toHaveBeenCalledTimes(2);

    listDirectory.mockResolvedValueOnce(fail(404, 'gone'));
    store.loadChildren('/mod/other');
    await flushPromises();
    expect(store.errorsByPath()['/mod/other']).toEqual({ code: 404, message: 'gone' });
    expect(store.status()).toEqual({ kind: 'success' });
    store.loadChildren('/mod/other');
    await flushPromises();
    expect(listDirectory).toHaveBeenCalledTimes(3);
  });

  it('ignores child requests while no root is loaded', async () => {
    store.loadChildren('/mod/common');
    await flushPromises();
    expect(listDirectory).not.toHaveBeenCalled();
  });

  it('drops listings of a superseded root so stale results never land', async () => {
    const firstRoot = deferred<ListResult>();
    const firstChild = deferred<ListResult>();
    const secondRoot = deferred<ListResult>();
    listDirectory
      .mockReturnValueOnce(firstRoot.promise)
      .mockReturnValueOnce(firstChild.promise)
      .mockReturnValueOnce(secondRoot.promise);
    store.loadRoot({ hideUnsupportedFiles: false, root: '/first' });
    store.loadChildren('/first/common');
    store.loadRoot({ hideUnsupportedFiles: false, root: '/second' });
    firstRoot.resolve(ok([README]));
    firstChild.resolve(ok([AIR]));
    await flushPromises();
    expect(store.root()).toBe('/second');
    expect(store.status()).toEqual({ kind: 'loading' });
    expect(store.childrenByPath()).toEqual({});
    secondRoot.resolve(ok([COMMON]));
    await flushPromises();
    expect(store.status()).toEqual({ kind: 'success' });
    expect(store.childrenByPath()).toEqual({ '/second': [COMMON] });
  });

  it('drops a child listing requested before the file filter changed', async () => {
    listDirectory.mockResolvedValueOnce(ok([COMMON]));
    store.loadRoot({ hideUnsupportedFiles: false, root: '/mod' });
    await flushPromises();
    const child = deferred<ListResult>();
    listDirectory.mockReturnValueOnce(child.promise).mockResolvedValueOnce(ok([COMMON]));
    store.loadChildren('/mod/common');
    store.loadRoot({ hideUnsupportedFiles: true, root: '/mod' });
    await flushPromises();
    child.resolve(ok([AIR]));
    await flushPromises();
    expect(store.childrenByPath()).toEqual({ '/mod': [COMMON] });
    expect(store.status()).toEqual({ kind: 'success' });
  });

  it('replaces the expanded paths', () => {
    store.setExpanded(['/mod', '/mod/common']);
    expect(store.expanded()).toEqual(['/mod', '/mod/common']);
  });
});
