import { GameId } from '@contracts';

import { pluginRegistryService } from '../plugins';
import { preferencesService } from '../preferences';

export async function activeGameFolderPath(): Promise<null | string> {
  const gameId = activeGameId();
  if (gameId === null) {
    return null;
  }

  const pluginSettings = await preferencesService.get('pluginSettings');
  return pluginSettings?.[gameId]?.gameFolderPath ?? null;
}

export function activeGameId(): GameId | null {
  return pluginRegistryService.list()[0]?.gameId ?? null;
}
