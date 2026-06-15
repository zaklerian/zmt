import { RendererPlugin } from '@r-game-hoi4';

import { entityFormRegistry } from '../shared/entity-form';

export function registerPluginFormDescriptors(
  plugins: readonly RendererPlugin[],
): void {
  for (const plugin of plugins) {
    for (const descriptor of plugin.formDescriptors ?? []) {
      entityFormRegistry.register(descriptor);
    }
  }
}
