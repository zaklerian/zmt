import { type GameId, type GamePlugin, type GamePluginList, IPC_ERROR_CODES } from '@zmt/contracts';

import { IpcFailure } from '../ipc/ipc-failure.model';

export interface PluginRegistry {
  readonly get: (gameId: GameId) => GamePlugin | null;
  readonly list: () => GamePluginList;
  readonly register: (plugin: GamePlugin) => void;
}

export function createPluginRegistry(): PluginRegistry {
  const registry = new Map<GameId, GamePlugin>();
  const service: PluginRegistry = {
    get: (gameId) => registry.get(gameId) ?? null,
    list: () => [...registry.values()],
    register: (plugin) => {
      if (registry.has(plugin.gameId)) {
        throw new IpcFailure(
          IPC_ERROR_CODES.conflict,
          `Plugin already registered for gameId: ${plugin.gameId}`,
        );
      }
      registry.set(plugin.gameId, plugin);
    },
  };
  return Object.freeze(service);
}

export function registerPlugins(registry: PluginRegistry, plugins: GamePluginList): void {
  for (const plugin of plugins) {
    registry.register(plugin);
  }
}
