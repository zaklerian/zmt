import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { ok } from '@zmt/contracts';
import { collectUnhandledErrors, NotImplementedError } from '@zmt/renderer/pending/util';

import { TechnologyFormStore } from './technology-form.store';

describe('TechnologyFormStore', () => {
  let store: InstanceType<typeof TechnologyFormStore>;

  beforeEach(() => {
    store = TestBed.inject(TechnologyFormStore);
  });

  it('starts closed and idle', () => {
    expect(store.mode()).toBeNull();
    expect(store.model()).toBeNull();
    expect(store.status()).toEqual({ kind: 'idle' });
    expect(store.busy()).toBe(false);
    expect(store.isOpen()).toBe(false);
  });

  it('derives busy and open from the status and the model', () => {
    patchState(unprotected(store), {
      mode: 'edit',
      model: {
        blocks: [],
        errorMessage: () => 'failed',
        errorTitle: 'Action failed',
        save: () => Promise.resolve(ok(null)),
      },
      status: { kind: 'loading' },
    });
    expect(store.busy()).toBe(true);
    expect(store.isOpen()).toBe(true);
  });

  it('declares the open and save flows as pending loaders', async () => {
    for (const run of [
      () => store.openEdit('fighter1'),
      () => store.openAddChild('fighter1'),
      () => store.openAddFree({ x: 10, y: 20 }),
      () => store.save({ research_cost: '2' }),
    ]) {
      const errors = await collectUnhandledErrors(() => {
        run();
      });
      expect(errors).toEqual([expect.any(NotImplementedError)]);
    }
  });

  it('closes the form and returns to idle', () => {
    patchState(unprotected(store), {
      mode: 'edit',
      model: {
        blocks: [],
        errorMessage: () => 'failed',
        errorTitle: 'Action failed',
        save: () => Promise.resolve(ok(null)),
      },
      status: { error: { code: 500, message: 'x' }, kind: 'error' },
    });
    store.close();
    expect(store.mode()).toBeNull();
    expect(store.model()).toBeNull();
    expect(store.status()).toEqual({ kind: 'idle' });
    expect(store.isOpen()).toBe(false);
  });
});
