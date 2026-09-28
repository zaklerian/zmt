import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { collectUnhandledErrors, NotImplementedError } from '@zmt/renderer/pending/util';

import { basename, WorkspaceStore } from './workspace.store';

describe('WorkspaceStore', () => {
  let store: InstanceType<typeof WorkspaceStore>;

  beforeEach(() => {
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

  it('declares openFolder as a pending loader', async () => {
    const errors = await collectUnhandledErrors(() => {
      store.openFolder();
    });
    expect(errors).toEqual([expect.any(NotImplementedError)]);
    expect(errors[0]).toMatchObject({ ticket: 'ZMT-A-5' });
  });

  it('declares closeFolder as pending', () => {
    expect(() => {
      store.closeFolder();
    }).toThrow(NotImplementedError);
  });
});
