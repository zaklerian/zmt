import type { GameId } from '@zmt/contracts';
import type {
  EntityFormDescriptor,
  EntityRecognizer,
  RendererPlugin,
} from '@zmt/renderer/plugin/util';

import { computed } from '@angular/core';
import { signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { HOI4_RENDERER_PLUGIN } from '@zmt/renderer/hoi4/util';
import { pending } from '@zmt/renderer/pending/util';

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
  withMethods(() => {
    const recognize: (filePath: string) => EntityRecognizer | null = () => pending('ZMT-A-5');
    const register: (plugin: RendererPlugin) => void = () => pending('ZMT-A-5');
    const resolveFormDescriptor: (
      gameId: GameId,
      entityId: string,
    ) => EntityFormDescriptor | null = () => pending('ZMT-A-5');
    return { recognize, register, resolveFormDescriptor };
  }),
);
