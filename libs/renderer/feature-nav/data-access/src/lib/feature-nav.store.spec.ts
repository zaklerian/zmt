import type { FeatureContribution } from '@zmt/contracts';

import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { collectUnhandledErrors, NotImplementedError } from '@zmt/renderer/pending/util';

import { FeatureNavStore } from './feature-nav.store';

const AIRCRAFT: FeatureContribution = { enabled: true, featureId: 'aircraft', label: 'Aircraft' };

describe('FeatureNavStore', () => {
  let store: InstanceType<typeof FeatureNavStore>;

  beforeEach(() => {
    store = TestBed.inject(FeatureNavStore);
  });

  it('starts with no features and no active feature', () => {
    expect(store.features()).toEqual([]);
    expect(store.activeFeatureId()).toBeNull();
    expect(store.status()).toEqual({ kind: 'idle' });
    expect(store.activeFeature()).toBeNull();
    expect(store.hasFeatures()).toBe(false);
  });

  it('resolves the active feature from the loaded list', () => {
    patchState(unprotected(store), { features: [AIRCRAFT] });
    expect(store.hasFeatures()).toBe(true);
    expect(store.activeFeature()).toBeNull();
    patchState(unprotected(store), { activeFeatureId: 'aircraft' });
    expect(store.activeFeature()).toBe(AIRCRAFT);
  });

  it('declares load as a pending loader', async () => {
    const errors = await collectUnhandledErrors(() => {
      store.load();
    });
    expect(errors).toEqual([expect.any(NotImplementedError)]);
  });

  it('declares select as pending', () => {
    expect(() => {
      store.select('aircraft');
    }).toThrow(NotImplementedError);
  });
});
