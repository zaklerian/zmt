import type { ModDescriptorValues } from '@zmt/renderer/mod-info/util';

import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { collectUnhandledErrors, NotImplementedError } from '@zmt/renderer/pending/util';

import { ModInfoStore } from './mod-info.store';

const VALUES: ModDescriptorValues = {
  name: 'My mod',
  path: 'mod/my-mod',
  picture: 'thumbnail.png',
  supportedVersion: '1.14.*',
  tags: ['Gameplay'],
  version: '0.1',
};

describe('ModInfoStore', () => {
  let store: InstanceType<typeof ModInfoStore>;

  beforeEach(() => {
    store = TestBed.inject(ModInfoStore);
  });

  it('starts without a descriptor', () => {
    expect(store.descriptorPath()).toBeNull();
    expect(store.values()).toBeNull();
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

  it('declares load and save as pending loaders', async () => {
    const loadErrors = await collectUnhandledErrors(() => {
      store.load('/mod/descriptor.mod');
    });
    expect(loadErrors).toEqual([expect.any(NotImplementedError)]);
    const saveErrors = await collectUnhandledErrors(() => {
      store.save(VALUES);
    });
    expect(saveErrors).toEqual([expect.any(NotImplementedError)]);
  });
});
