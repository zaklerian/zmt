import { IPC_CHANNELS } from '@contracts';

import { ipcHandle } from '../ipc';

export function registerSystemHandlers(): void {
  ipcHandle<string>(IPC_CHANNELS.system.ping, async () => 'pong');
}
