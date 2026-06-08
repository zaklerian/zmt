import { RendererPlugin } from '@r-game-hoi4';

import { rendererPluginRegistryService } from './plugin-registry.service';

export function useRendererPlugins(): readonly RendererPlugin[] {
  return rendererPluginRegistryService.list();
}
