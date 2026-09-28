import type { FsNode, IpcChannelResult, IpcRequest } from '@zmt/contracts';

import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { fail, ok } from '@zmt/contracts';
import { deferred } from '@zmt/renderer/async-status/util';

import { FileSearchStore, SEARCH_DEBOUNCE_MS, toActiveSearch } from './file-search.store';
import { ModContentService } from './mod-content.service';

type SearchResult = IpcChannelResult<'fs:searchFiles'>;

const HIT: FsNode = {
  extension: '.txt',
  hasChildren: false,
  name: 'air.txt',
  path: '/mod/common/technologies/air.txt',
  support: 'editable',
  type: 'file',
};

const REQUEST = { hideUnsupportedFiles: true, query: 'air', root: '/mod' };

describe('FileSearchStore', () => {
  let store: InstanceType<typeof FileSearchStore>;
  const searchFiles = vi.fn<(request: IpcRequest<'fs:searchFiles'>) => Promise<SearchResult>>();

  beforeEach(() => {
    vi.useFakeTimers();
    searchFiles.mockReset();
    TestBed.configureTestingModule({
      providers: [{ provide: ModContentService, useValue: { searchFiles } }],
    });
    store = TestBed.inject(FileSearchStore);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function settleAfterDebounce(): Promise<void> {
    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
  }

  it('starts idle with an empty query and no results', () => {
    expect(store.query()).toBe('');
    expect(store.results()).toEqual([]);
    expect(store.status()).toEqual({ kind: 'idle' });
    expect(store.isIdle()).toBe(true);
    expect(store.hasResults()).toBe(false);
    expect(SEARCH_DEBOUNCE_MS).toBe(250);
  });

  it('derives idleness from the trimmed query and hasResults from the results', () => {
    patchState(unprotected(store), { query: '   ' });
    expect(store.isIdle()).toBe(true);
    patchState(unprotected(store), { query: 'air', results: [HIT] });
    expect(store.isIdle()).toBe(false);
    expect(store.hasResults()).toBe(true);
  });

  it('treats a blank query or a missing root as an idle request', () => {
    expect(toActiveSearch({ ...REQUEST, query: '  ' })).toBeNull();
    expect(toActiveSearch({ ...REQUEST, root: null })).toBeNull();
    expect(toActiveSearch(REQUEST)).toEqual(REQUEST);
  });

  it('debounces the query and loads the matching files', async () => {
    const search = deferred<SearchResult>();
    searchFiles.mockReturnValue(search.promise);
    store.search(REQUEST);
    expect(store.query()).toBe('air');
    expect(store.status()).toEqual({ kind: 'idle' });
    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS - 1);
    expect(searchFiles).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(store.status()).toEqual({ kind: 'loading' });
    expect(searchFiles).toHaveBeenCalledWith({
      options: { hideUnsupportedFiles: true },
      query: 'air',
      root: '/mod',
    });
    search.resolve(ok([HIT]));
    await vi.runAllTimersAsync();
    expect(store.results()).toEqual([HIT]);
    expect(store.status()).toEqual({ kind: 'success' });
  });

  it('only searches the last query typed within the debounce window', async () => {
    searchFiles.mockResolvedValue(ok([HIT]));
    store.search({ ...REQUEST, query: 'a' });
    store.search({ ...REQUEST, query: 'ai' });
    store.search({ ...REQUEST, query: 'air' });
    await settleAfterDebounce();
    expect(searchFiles).toHaveBeenCalledTimes(1);
    expect(searchFiles).toHaveBeenCalledWith(expect.objectContaining({ query: 'air' }));
  });

  it.each([400, 403, 404, 409, 413, 500] as const)('reports a %i failure', async (code) => {
    searchFiles.mockResolvedValue(fail(code, 'boom'));
    store.search(REQUEST);
    await settleAfterDebounce();
    await vi.runAllTimersAsync();
    expect(store.results()).toEqual([]);
    expect(store.status()).toEqual({ error: { code, message: 'boom' }, kind: 'error' });
  });

  it('clears the results at once when the query is blanked or the root closes', async () => {
    searchFiles.mockResolvedValue(ok([HIT]));
    store.search(REQUEST);
    await settleAfterDebounce();
    await vi.runAllTimersAsync();
    expect(store.hasResults()).toBe(true);

    store.search({ ...REQUEST, query: '' });
    expect(store.query()).toBe('');
    expect(store.results()).toEqual([]);
    expect(store.status()).toEqual({ kind: 'idle' });

    store.search({ ...REQUEST, root: null });
    await settleAfterDebounce();
    expect(searchFiles).toHaveBeenCalledTimes(1);
  });

  it('lets a newer search supersede an older one so the stale result never lands', async () => {
    const first = deferred<SearchResult>();
    const second = deferred<SearchResult>();
    searchFiles.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    store.search({ ...REQUEST, query: 'a' });
    await settleAfterDebounce();
    store.search({ ...REQUEST, query: 'b' });
    await settleAfterDebounce();
    second.resolve(ok([HIT]));
    await vi.runAllTimersAsync();
    first.resolve(ok([]));
    await vi.runAllTimersAsync();
    expect(store.results()).toEqual([HIT]);
    expect(store.status()).toEqual({ kind: 'success' });
  });

  it('resets everything on clear', () => {
    patchState(unprotected(store), { query: 'air', results: [HIT], status: { kind: 'success' } });
    store.clear();
    expect(store.query()).toBe('');
    expect(store.results()).toEqual([]);
    expect(store.status()).toEqual({ kind: 'idle' });
  });
});
