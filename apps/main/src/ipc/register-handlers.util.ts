import { type FsHandlerDependencies, registerFsHandlers } from '../fs/fs-handlers.util';
import {
  type PluginHandlerDependencies,
  registerPluginHandlers,
} from '../plugin/plugin-handlers.util';
import { registerSystemHandlers } from '../system/system-handlers.util';

export type IpcDependencies = FsHandlerDependencies & PluginHandlerDependencies;

export function registerIpcHandlers(dependencies: IpcDependencies): void {
  registerSystemHandlers(dependencies);
  registerFsHandlers(dependencies);
  registerPluginHandlers(dependencies);
}
