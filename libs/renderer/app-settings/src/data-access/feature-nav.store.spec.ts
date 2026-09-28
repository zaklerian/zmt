import type { FeatureContribution, GamePlugin } from '@zmt/contracts';

import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';

import { AppSettingsStore } from './app-settings.store';
import { enabledFeatures, FeatureNavStore } from './feature-nav.store';
import { PluginService } from './plugin.service';

const AIRCRAFT: FeatureContribution = { enabled: true, featureId: 'aircraft', label: 'Aircraft' };
const TRAITS: FeatureContribution = { enabled: false, featureId: 'traits', label: 'Traits' };

const HOI4: GamePlugin = {
  displayName: 'Hearts of Iron IV',
  features: [AIRCRAFT, TRAITS],
  gameId: 'hoi4',
};

describe('FeatureNavStore', () => {
  let store: InstanceType<typeof FeatureNavStore>;
  let settings: InstanceType<typeof AppSettingsStore>;
  const list = vi.fn();

  beforeEach(() => {
    list.mockReset();
    TestBed.configureTestingModule({
      providers: [{ provide: PluginService, useValue: { list } }],
    });
    store = TestBed.inject(FeatureNavStore);
    settings = TestBed.inject(AppSettingsStore);
  });

  it('starts with no features and no active feature', () => {
    expect(store.features()).toEqual([]);
    expect(store.activeFeatureId()).toBeNull();
    expect(store.activeFeature()).toBeNull();
    expect(store.hasFeatures()).toBe(false);
  });

  it('enables a feature by its stored toggle, falling back to the plugin default', () => {
    expect(enabledFeatures([HOI4], {})).toEqual([AIRCRAFT]);
    expect(enabledFeatures([HOI4], { aircraft: false, traits: true })).toEqual([TRAITS]);
    expect(enabledFeatures([], { aircraft: true })).toEqual([]);
  });

  it('derives the enabled features from the settings plugins and toggles without a plugin fetch', () => {
    patchState(unprotected(settings), { plugins: [HOI4] });
    expect(store.features()).toEqual([AIRCRAFT]);
    expect(store.hasFeatures()).toBe(true);

    patchState(unprotected(settings), { featureToggles: { aircraft: false, traits: true } });
    expect(store.features()).toEqual([TRAITS]);

    patchState(unprotected(settings), { plugins: [] });
    expect(store.features()).toEqual([]);
    expect(list).not.toHaveBeenCalled();
  });

  it('resolves the active feature from the derived list', () => {
    patchState(unprotected(settings), { plugins: [HOI4] });
    expect(store.activeFeature()).toBeNull();
    store.select('aircraft');
    expect(store.activeFeature()).toBe(AIRCRAFT);
    store.select('traits');
    expect(store.activeFeatureId()).toBe('traits');
    expect(store.activeFeature()).toBeNull();
    store.select(null);
    expect(store.activeFeatureId()).toBeNull();
  });
});
