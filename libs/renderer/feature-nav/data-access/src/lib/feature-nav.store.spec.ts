import type { FeatureContribution, GamePlugin, IpcChannelResult } from '@zmt/contracts';

import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { fail, ok } from '@zmt/contracts';
import { AppSettingsStore } from '@zmt/renderer/app-settings/data-access';
import { deferred, flushPromises } from '@zmt/renderer/async-status/util';
import { PluginService } from '@zmt/renderer/plugin/data-access';

import { enabledFeatures, FeatureNavStore } from './feature-nav.store';

type ListResult = IpcChannelResult<'plugins:list'>;

const AIRCRAFT: FeatureContribution = { enabled: true, featureId: 'aircraft', label: 'Aircraft' };
const TRAITS: FeatureContribution = { enabled: false, featureId: 'traits', label: 'Traits' };

const HOI4: GamePlugin = {
  displayName: 'Hearts of Iron IV',
  features: [AIRCRAFT, TRAITS],
  gameId: 'hoi4',
};

describe('FeatureNavStore', () => {
  let store: InstanceType<typeof FeatureNavStore>;
  const list = vi.fn<() => Promise<ListResult>>();

  beforeEach(() => {
    list.mockReset();
    TestBed.configureTestingModule({
      providers: [{ provide: PluginService, useValue: { list } }],
    });
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

  it('enables a feature by its stored toggle, falling back to the plugin default', () => {
    expect(enabledFeatures([HOI4], {})).toEqual([AIRCRAFT]);
    expect(enabledFeatures([HOI4], { aircraft: false, traits: true })).toEqual([TRAITS]);
    expect(enabledFeatures([], { aircraft: true })).toEqual([]);
  });

  it('loads the enabled features of every plugin using the saved toggles', async () => {
    patchState(unprotected(TestBed.inject(AppSettingsStore)), { featureToggles: { traits: true } });
    const listing = deferred<ListResult>();
    list.mockReturnValue(listing.promise);
    store.load();
    expect(store.status()).toEqual({ kind: 'loading' });
    listing.resolve(ok([HOI4]));
    await flushPromises();
    expect(store.status()).toEqual({ kind: 'success' });
    expect(store.features()).toEqual([AIRCRAFT, TRAITS]);
  });

  it.each([400, 403, 404, 409, 413, 500] as const)('reports a %i failure', async (code) => {
    patchState(unprotected(store), { features: [AIRCRAFT] });
    list.mockResolvedValue(fail(code, 'boom'));
    store.load();
    await flushPromises();
    expect(store.status()).toEqual({ error: { code, message: 'boom' }, kind: 'error' });
    expect(store.features()).toEqual([]);
  });

  it('lets a newer load supersede an older one so the stale list never lands', async () => {
    const first = deferred<ListResult>();
    const second = deferred<ListResult>();
    list.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    store.load();
    store.load();
    second.resolve(ok([]));
    await flushPromises();
    first.resolve(ok([HOI4]));
    await flushPromises();
    expect(store.features()).toEqual([]);
    expect(store.status()).toEqual({ kind: 'success' });
  });

  it('selects and clears the active feature', () => {
    patchState(unprotected(store), { features: [AIRCRAFT] });
    store.select('aircraft');
    expect(store.activeFeature()).toBe(AIRCRAFT);
    store.select(null);
    expect(store.activeFeatureId()).toBeNull();
  });
});
