import type { GameId } from '@zmt/contracts';
import type {
  EntityFormDescriptor,
  EntityRecognizer,
  RendererPlugin,
} from '@zmt/renderer/plugin/util';

import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { HOI4_RENDERER_PLUGIN } from '@zmt/renderer/hoi4/util';

export interface PluginRegistryState {
  readonly plugins: readonly RendererPlugin[];
}

const INITIAL_STATE: PluginRegistryState = {
  plugins: [HOI4_RENDERER_PLUGIN],
};

export const PluginRegistryStore = signalStore(
  { providedIn: 'root' },
  withState(INITIAL_STATE),
  withComputed(({ plugins }) => ({
    formDescriptors: computed<readonly EntityFormDescriptor[]>(() =>
      plugins().flatMap((plugin) => plugin.formDescriptors),
    ),
    recognizers: computed<readonly EntityRecognizer[]>(() =>
      plugins().flatMap((plugin) => plugin.recognizers),
    ),
  })),
  withMethods((store) => {
    const recognize = (filePath: string): EntityRecognizer | null =>
      store.recognizers().find((recognizer) => recognizer.matches(filePath)) ?? null;
    const register = (plugin: RendererPlugin): void => {
      patchState(store, (state) => ({
        plugins: [...state.plugins.filter((known) => known.gameId !== plugin.gameId), plugin],
      }));
    };
    const resolveFormDescriptor = (gameId: GameId, entityId: string): EntityFormDescriptor | null =>
      store
        .formDescriptors()
        .find((descriptor) => descriptor.gameId === gameId && descriptor.entityId === entityId) ??
      null;
    return { recognize, register, resolveFormDescriptor };
  }),
);
