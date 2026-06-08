import { GamePlugin, IPC_CHANNELS } from '@contracts';

import { ipcHandle } from '../ipc';
import { pluginRegistryService } from '../plugins';

export function registerPluginsHandlers(): void {
  ipcHandle<readonly GamePlugin[]>(IPC_CHANNELS.plugins.list, async () =>
    pluginRegistryService.list(),
  );
}
