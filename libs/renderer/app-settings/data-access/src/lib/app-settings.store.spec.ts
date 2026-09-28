import type { GamePlugin, IpcChannelResult } from '@zmt/contracts';

import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { fail, ok } from '@zmt/contracts';
import { deferred, flushPromises } from '@zmt/renderer/async-status/util';
import { PluginService } from '@zmt/renderer/plugin/data-access';

import { AppSettingsStore } from './app-settings.store';

type ListResult = IpcChannelResult<'plugins:list'>;

const HOI4: GamePlugin = {
  displayName: 'Hearts of Iron IV',
  features: [{ enabled: true, featureId: 'aircraft', label: 'Aircraft' }],
  gameId: 'hoi4',
};

const STELLARIS: GamePlugin = { displayName: 'Stellaris', features: [], gameId: 'stellaris' };

describe('AppSettingsStore', () => {
  let store: InstanceType<typeof AppSettingsStore>;
  const list = vi.fn<() => Promise<ListResult>>();

  beforeEach(() => {
    list.mockReset();
    TestBed.configureTestingModule({
      providers: [{ provide: PluginService, useValue: { list } }],
    });
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

  it('loads the plugins and activates the first one', async () => {
    const listing = deferred<ListResult>();
    list.mockReturnValue(listing.promise);
    store.load();
    expect(store.status()).toEqual({ kind: 'loading' });
    listing.resolve(ok([HOI4, STELLARIS]));
    await flushPromises();
    expect(store.status()).toEqual({ kind: 'success' });
    expect(store.plugins()).toEqual([HOI4, STELLARIS]);
    expect(store.activeGameId()).toBe('hoi4');
    expect(list).toHaveBeenCalledWith();
  });

  it('keeps the chosen game across reloads while it is still listed', async () => {
    patchState(unprotected(store), { activeGameId: 'stellaris' });
    list.mockResolvedValueOnce(ok([HOI4, STELLARIS])).mockResolvedValueOnce(ok([HOI4]));
    store.load();
    await flushPromises();
    expect(store.activeGameId()).toBe('stellaris');
    store.load();
    await flushPromises();
    expect(store.activeGameId()).toBe('hoi4');
    list.mockResolvedValueOnce(ok([]));
    store.load();
    await flushPromises();
    expect(store.activeGameId()).toBeNull();
  });

  it.each([400, 403, 404, 409, 413, 500] as const)('reports a %i failure', async (code) => {
    list.mockResolvedValue(fail(code, 'boom'));
    store.load();
    await flushPromises();
    expect(store.status()).toEqual({ error: { code, message: 'boom' }, kind: 'error' });
    expect(store.plugins()).toEqual([]);
  });

  it('lets a newer load supersede an older one so the stale list never lands', async () => {
    const first = deferred<ListResult>();
    const second = deferred<ListResult>();
    list.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    store.load();
    store.load();
    second.resolve(ok([STELLARIS]));
    await flushPromises();
    first.resolve(ok([HOI4]));
    await flushPromises();
    expect(store.plugins()).toEqual([STELLARIS]);
    expect(store.activeGameId()).toBe('stellaris');
  });

  it('saves the values in memory and marks the save as done', () => {
    patchState(unprotected(store), { activeGameId: 'hoi4', plugins: [HOI4] });
    store.save({ activeGameId: 'hoi4', features: { aircraft: false }, hideUnsupportedFiles: true });
    expect(store.featureToggles()).toEqual({ aircraft: false });
    expect(store.hideUnsupportedFiles()).toBe(true);
    expect(store.saveStatus()).toEqual({ kind: 'success' });
    expect(store.values()).toEqual({
      activeGameId: 'hoi4',
      features: { aircraft: false },
      hideUnsupportedFiles: true,
    });
  });

  it('selects only a listed game', () => {
    patchState(unprotected(store), { activeGameId: 'hoi4', plugins: [HOI4, STELLARIS] });
    store.selectGame('stellaris');
    expect(store.activeGameId()).toBe('stellaris');
    store.selectGame('v3');
    expect(store.activeGameId()).toBe('stellaris');
  });
});
