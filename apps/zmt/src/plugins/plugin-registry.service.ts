import { GameId } from '@contracts';
import { RendererPlugin } from '@r-game-hoi4';

import { KNOWN_RENDERER_PLUGINS } from './known-renderer-plugins.const';

const registry = new Map<GameId, RendererPlugin>();
for (const plugin of KNOWN_RENDERER_PLUGINS) {
  registry.set(plugin.gameId, plugin);
}

export const rendererPluginRegistryService = {
  get(gameId: GameId): null | RendererPlugin {
    return registry.get(gameId) ?? null;
  },
  list(): readonly RendererPlugin[] {
    return Array.from(registry.values());
  },
};
