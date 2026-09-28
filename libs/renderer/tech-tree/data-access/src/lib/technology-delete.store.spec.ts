import type { TechnologyDeletePlanResult } from '@zmt/renderer/tech-tree/util';

import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { collectUnhandledErrors, NotImplementedError } from '@zmt/renderer/pending/util';

import { TechnologyDeleteStore } from './technology-delete.store';

const PLAN: TechnologyDeletePlanResult = {
  item: { blocked: [], inboundReferences: [], targets: ['fighter1'] },
  tree: { blocked: [], inboundReferences: ['cas1'], targets: ['fighter1', 'fighter2'] },
};

describe('TechnologyDeleteStore', () => {
  let store: InstanceType<typeof TechnologyDeleteStore>;

  beforeEach(() => {
    store = TestBed.inject(TechnologyDeleteStore);
  });

  it('starts with no plan pending', () => {
    expect(store.plan()).toBeNull();
    expect(store.token()).toBeNull();
    expect(store.status()).toEqual({ kind: 'idle' });
    expect(store.deleting()).toBe(false);
    expect(store.hasTree()).toBe(false);
    expect(store.isConfirming()).toBe(false);
  });

  it('derives confirmation, tree availability and deleting from state', () => {
    patchState(unprotected(store), { plan: PLAN, status: { kind: 'deleting' }, token: 'fighter1' });
    expect(store.isConfirming()).toBe(true);
    expect(store.hasTree()).toBe(true);
    expect(store.deleting()).toBe(true);
    patchState(unprotected(store), { plan: { item: PLAN.item, tree: PLAN.item } });
    expect(store.hasTree()).toBe(false);
  });

  it('declares open and commit as pending loaders', async () => {
    const openErrors = await collectUnhandledErrors(() => {
      store.open('fighter1');
    });
    expect(openErrors).toEqual([expect.any(NotImplementedError)]);
    const commitErrors = await collectUnhandledErrors(() => {
      store.commit('tree');
    });
    expect(commitErrors).toEqual([expect.any(NotImplementedError)]);
  });

  it('cancels the confirmation and returns to idle', () => {
    patchState(unprotected(store), { plan: PLAN, status: { kind: 'deleting' }, token: 'fighter1' });
    store.cancel();
    expect(store.plan()).toBeNull();
    expect(store.token()).toBeNull();
    expect(store.status()).toEqual({ kind: 'idle' });
    expect(store.isConfirming()).toBe(false);
  });
});
