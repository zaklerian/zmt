import { IPC_CHANNELS } from '@zmt/contracts';

import { ipcHandle, type IpcHandleOptions } from '../ipc/ipc-handle.util';

export function registerSystemHandlers(dependencies: IpcHandleOptions): void {
  ipcHandle(IPC_CHANNELS.system.ping, async () => Promise.resolve('pong' as const), dependencies);
}
