import type { GameId, GamePlugin } from '@zmt/contracts';
import type { AppSettingsValues, FeatureToggles } from '@zmt/renderer/app-settings/util';

import { computed } from '@angular/core';
import { signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { ASYNC_IDLE, type AsyncStatus } from '@zmt/renderer/async-status/util';
import { pending } from '@zmt/renderer/pending/util';
import { type Observable, pipe, tap } from 'rxjs';

export interface AppSettingsState {
  readonly activeGameId: GameId | null;
  readonly featureToggles: FeatureToggles;
  readonly hideUnsupportedFiles: boolean;
  readonly plugins: readonly GamePlugin[];
  readonly saveStatus: AsyncStatus;
  readonly status: AsyncStatus;
}

const INITIAL_STATE: AppSettingsState = {
  activeGameId: null,
  featureToggles: {},
  hideUnsupportedFiles: false,
  plugins: [],
  saveStatus: ASYNC_IDLE,
  status: ASYNC_IDLE,
};

export const AppSettingsStore = signalStore(
  { providedIn: 'root' },
  withState(INITIAL_STATE),
  withComputed(({ activeGameId, featureToggles, hideUnsupportedFiles, plugins, saveStatus }) => {
    const activePlugin = computed<GamePlugin | null>(
      () => plugins().find((plugin) => plugin.gameId === activeGameId()) ?? null,
    );
    return {
      activePlugin,
      hasPlugins: computed(() => plugins().length > 0),
      saving: computed(() => saveStatus().kind === 'loading'),
      values: computed<AppSettingsValues | null>(() => {
        const plugin = activePlugin();
        return plugin === null
          ? null
          : {
              activeGameId: plugin.gameId,
              features: featureToggles(),
              hideUnsupportedFiles: hideUnsupportedFiles(),
            };
      }),
    };
  }),
  withMethods(() => {
    const selectGame: (gameId: GameId) => void = () => pending('ZMT-A-5');
    return {
      load: rxMethod((source$: Observable<void>) => source$.pipe(tap(() => pending('ZMT-A-5')))),
      save: rxMethod<AppSettingsValues>(pipe(tap(() => pending('ZMT-A-5')))),
      selectGame,
    };
  }),
);
