import { GAME_IDS, GamePlugin, IPC_CHANNELS } from '@contracts';
import { ipcMain } from 'electron';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { pluginRegistryService } from '../plugins';
import {
  extractIpcError,
  getCapturedHandler,
  makeInvokeEvent,
} from './__test-utils__/capture-ipc-handler';
import { registerPluginsHandlers } from './plugins-handlers.setup';

vi.mock('../plugins', () => ({
  pluginRegistryService: {
    get: vi.fn(),
    list: vi.fn(),
    register: vi.fn(),
  },
}));

const fakePlugin: GamePlugin = {
  displayName: 'Hearts of Iron IV',
  features: [],
  gameId: GAME_IDS.hoi4,
};

describe('registerPluginsHandlers', () => {
  beforeEach(() => {
    vi.mocked(ipcMain.handle).mockReset();
    vi.mocked(pluginRegistryService.list).mockReset();
    registerPluginsHandlers();
  });

  it('plugins:list returns the registry contents', async () => {
    vi.mocked(pluginRegistryService.list).mockReturnValue([fakePlugin]);
    const handler = getCapturedHandler(IPC_CHANNELS.plugins.list);
    await expect(handler(makeInvokeEvent())).resolves.toEqual([fakePlugin]);
  });

  it('plugins:list surfaces unexpected registry failures as code 500', async () => {
    vi.mocked(pluginRegistryService.list).mockImplementation(() => {
      throw new Error('registry exploded');
    });
    const handler = getCapturedHandler(IPC_CHANNELS.plugins.list);
    await expect(handler(makeInvokeEvent())).rejects.toSatisfy((error) => {
      const ipc = extractIpcError(error);
      return ipc.code === 500 && ipc.message === 'Internal error';
    });
  });
});
