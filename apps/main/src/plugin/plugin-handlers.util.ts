import { IPC_CHANNELS } from '@zmt/contracts';

import { ipcHandle, type IpcHandleOptions } from '../ipc/ipc-handle.util';
import { type PluginRegistry } from './plugin-registry.service';

export interface PluginHandlerDependencies extends IpcHandleOptions {
  readonly pluginRegistry: PluginRegistry;
}

export function registerPluginHandlers(dependencies: PluginHandlerDependencies): void {
  ipcHandle(
    IPC_CHANNELS.plugins.list,
    async () => Promise.resolve(dependencies.pluginRegistry.list()),
    dependencies,
  );
}
