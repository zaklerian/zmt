import type { FsNode } from '@zmt/contracts';

import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { collectUnhandledErrors, NotImplementedError } from '@zmt/renderer/pending/util';

import { FileSearchStore, SEARCH_DEBOUNCE_MS } from './file-search.store';

const HIT: FsNode = {
  extension: '.txt',
  hasChildren: false,
  name: 'air.txt',
  path: '/mod/common/technologies/air.txt',
  support: 'editable',
  type: 'file',
};

describe('FileSearchStore', () => {
  let store: InstanceType<typeof FileSearchStore>;

  beforeEach(() => {
    store = TestBed.inject(FileSearchStore);
  });

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

  it('declares search as a pending loader', async () => {
    const errors = await collectUnhandledErrors(() => {
      store.search({ hideUnsupportedFiles: false, query: 'air', root: '/mod' });
    });
    expect(errors).toEqual([expect.any(NotImplementedError)]);
  });

  it('declares clear as pending', () => {
    expect(() => {
      store.clear();
    }).toThrow(NotImplementedError);
  });
});
