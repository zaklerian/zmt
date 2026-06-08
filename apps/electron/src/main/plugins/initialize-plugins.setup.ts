import { KNOWN_PLUGINS } from './known-plugins.const';
import { pluginRegistryService } from './plugin-registry.service';

export function initializePlugins(): void {
  for (const plugin of KNOWN_PLUGINS) {
    pluginRegistryService.register(plugin);
  }
}
