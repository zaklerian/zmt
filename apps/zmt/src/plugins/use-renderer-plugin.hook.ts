import { GameId } from '@contracts';
import { RendererPlugin } from '@r-game-hoi4';

import { rendererPluginRegistryService } from './plugin-registry.service';

export function useRendererPlugin(
  gameId: GameId | null,
): null | RendererPlugin {
  if (gameId === null) return null;
  return rendererPluginRegistryService.get(gameId);
}
