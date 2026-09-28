import type { GameId, GamePlugin } from '@zmt/contracts';
import type { AppSettingsValues, FeatureToggles } from '@zmt/renderer/app-settings/util';

import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  ASYNC_IDLE,
  ASYNC_LOADING,
  ASYNC_SUCCESS,
  asyncError,
  type AsyncStatus,
  settle,
} from '@zmt/renderer/async-status/util';
import { PluginService } from '@zmt/renderer/plugin/data-access';
import { from, type Observable, switchMap, tap } from 'rxjs';

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
  withMethods((store, service = inject(PluginService)) => {
    const selectGame = (gameId: GameId): void => {
      if (store.plugins().some((plugin) => plugin.gameId === gameId)) {
        patchState(store, { activeGameId: gameId });
      }
    };
    return {
      load: rxMethod((source$: Observable<void>) =>
        source$.pipe(
          tap(() => {
            patchState(store, { status: ASYNC_LOADING });
          }),
          switchMap(() => from(service.list())),
          tap((result) => {
            settle(result, {
              failure: (error) => {
                patchState(store, { status: asyncError(error) });
              },
              success: (plugins) => {
                patchState(store, (state) => ({
                  activeGameId:
                    plugins.find((plugin) => plugin.gameId === state.activeGameId)?.gameId ??
                    plugins[0]?.gameId ??
                    null,
                  plugins,
                  status: ASYNC_SUCCESS,
                }));
              },
            });
          }),
        ),
      ),
      save: rxMethod<AppSettingsValues>(
        tap((values) => {
          patchState(store, {
            activeGameId: values.activeGameId,
            featureToggles: values.features,
            hideUnsupportedFiles: values.hideUnsupportedFiles,
            saveStatus: ASYNC_SUCCESS,
          });
        }),
      ),
      selectGame,
    };
  }),
);
