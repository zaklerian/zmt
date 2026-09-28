import { IPC_CHANNEL_LIST, IPC_CONTRACTS } from '@zmt/contracts';
import { ipcMain } from 'electron';

import { createAllowedRoot } from '../fs/allowed-root.service';
import { createPluginRegistry } from '../plugin/plugin-registry.service';
import { registerIpcHandlers } from './register-handlers.util';

describe('registerIpcHandlers', () => {
  beforeEach(() => {
    vi.mocked(ipcMain.handle).mockReset();
    registerIpcHandlers({
      allowedRoot: createAllowedRoot(),
      appOrigin: 'zmt://renderer',
      pluginRegistry: createPluginRegistry(),
    });
  });

  it('registers exactly one handler for every channel, and every channel has a contract', () => {
    const registered = vi.mocked(ipcMain.handle).mock.calls.map(([channel]) => channel);
    expect([...registered].sort()).toEqual([...IPC_CHANNEL_LIST].sort());
    expect(new Set(registered).size).toBe(registered.length);
    for (const channel of registered) {
      expect(IPC_CONTRACTS).toHaveProperty(channel);
    }
  });

  it('registers no channel outside the contract map', () => {
    for (const [channel] of vi.mocked(ipcMain.handle).mock.calls) {
      expect(Object.keys(IPC_CONTRACTS)).toContain(channel);
    }
  });
});
