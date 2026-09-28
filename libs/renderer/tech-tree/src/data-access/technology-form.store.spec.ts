import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { collectUnhandledErrors, NotImplementedError } from '@zmt/renderer/core';

import { TechnologyFormStore } from './technology-form.store';

describe('TechnologyFormStore', () => {
  let store: InstanceType<typeof TechnologyFormStore>;

  beforeEach(() => {
    store = TestBed.inject(TechnologyFormStore);
  });

  it('starts idle', () => {
    expect(store.status()).toEqual({ kind: 'idle' });
    expect(store.busy()).toBe(false);
  });

  it('derives busy from the status', () => {
    patchState(unprotected(store), { status: { kind: 'loading' } });
    expect(store.busy()).toBe(true);
    patchState(unprotected(store), {
      status: { error: { code: 500, message: 'x' }, kind: 'error' },
    });
    expect(store.busy()).toBe(false);
  });

  it('declares the open flows as pending loaders', async () => {
    for (const run of [
      () => store.openEdit('fighter1'),
      () => store.openAddChild('fighter1'),
      () => store.openAddFree({ x: 10, y: 20 }),
    ]) {
      const errors = await collectUnhandledErrors(() => {
        run();
      });
      expect(errors).toEqual([expect.any(NotImplementedError)]);
    }
  });
});
