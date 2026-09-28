import { IPC_CHANNELS } from '@zmt/contracts';
import { ipcMain } from 'electron';

import { type RawIpcListener } from '../ipc/ipc-handle.util';
import { registerSystemHandlers } from './system-handlers.util';

describe('registerSystemHandlers', () => {
  beforeEach(() => {
    vi.mocked(ipcMain.handle).mockReset();
    registerSystemHandlers({ appOrigin: 'zmt://renderer' });
  });

  it('registers the ping channel', () => {
    expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.system.ping, expect.any(Function));
  });

  it('answers pong in an ok envelope for a trusted sender', async () => {
    const listener = vi.mocked(ipcMain.handle).mock.calls[0]?.[1] as unknown as RawIpcListener;
    await expect(
      listener({ senderFrame: { parent: null, url: 'zmt://renderer/index.html' } }, undefined),
    ).resolves.toEqual({ data: 'pong', ok: true });
  });
});
