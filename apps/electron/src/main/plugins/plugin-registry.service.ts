import { GameId, GamePlugin, IPC_ERROR_CODES, IpcError } from '@contracts';

const registry = new Map<GameId, GamePlugin>();

export const pluginRegistryService = {
  get(gameId: GameId): GamePlugin | null {
    return registry.get(gameId) ?? null;
  },
  list(): readonly GamePlugin[] {
    return Array.from(registry.values());
  },
  register(plugin: GamePlugin): void {
    if (registry.has(plugin.gameId)) {
      throw {
        code: IPC_ERROR_CODES.CONFLICT,
        message: `Plugin already registered for gameId: ${plugin.gameId}`,
      } satisfies IpcError;
    }
    registry.set(plugin.gameId, plugin);
  },
};
