import type { GamePlugin } from '@zmt/contracts';

import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { collectUnhandledErrors, NotImplementedError } from '@zmt/renderer/pending/util';

import { AppSettingsStore } from './app-settings.store';

const HOI4: GamePlugin = {
  displayName: 'Hearts of Iron IV',
  features: [{ enabled: true, featureId: 'aircraft', label: 'Aircraft' }],
  gameId: 'hoi4',
};

describe('AppSettingsStore', () => {
  let store: InstanceType<typeof AppSettingsStore>;

  beforeEach(() => {
    store = TestBed.inject(AppSettingsStore);
  });

  it('starts with no plugins loaded and default toggles', () => {
    expect(store.plugins()).toEqual([]);
    expect(store.activeGameId()).toBeNull();
    expect(store.featureToggles()).toEqual({});
    expect(store.hideUnsupportedFiles()).toBe(false);
    expect(store.status()).toEqual({ kind: 'idle' });
    expect(store.saveStatus()).toEqual({ kind: 'idle' });
    expect(store.activePlugin()).toBeNull();
    expect(store.hasPlugins()).toBe(false);
    expect(store.saving()).toBe(false);
    expect(store.values()).toBeNull();
  });

  it('derives the active plugin and the form values from state', () => {
    patchState(unprotected(store), {
      activeGameId: 'hoi4',
      featureToggles: { aircraft: false },
      hideUnsupportedFiles: true,
      plugins: [HOI4],
    });
    expect(store.hasPlugins()).toBe(true);
    expect(store.activePlugin()).toBe(HOI4);
    expect(store.values()).toEqual({
      activeGameId: 'hoi4',
      features: { aircraft: false },
      hideUnsupportedFiles: true,
    });
    patchState(unprotected(store), { saveStatus: { kind: 'loading' } });
    expect(store.saving()).toBe(true);
  });

  it('declares load and save as pending loaders', async () => {
    const loadErrors = await collectUnhandledErrors(() => {
      store.load();
    });
    expect(loadErrors).toEqual([expect.any(NotImplementedError)]);
    const saveErrors = await collectUnhandledErrors(() => {
      store.save({ activeGameId: 'hoi4', features: {}, hideUnsupportedFiles: false });
    });
    expect(saveErrors).toEqual([expect.any(NotImplementedError)]);
  });

  it('declares selectGame as pending', () => {
    expect(() => {
      store.selectGame('hoi4');
    }).toThrow(NotImplementedError);
  });
});
