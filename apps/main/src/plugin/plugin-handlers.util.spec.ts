import { FEATURE_IDS, GAME_IDS, IPC_CHANNELS } from '@zmt/contracts';
import { ipcMain } from 'electron';

import { type RawIpcListener } from '../ipc/ipc-handle.util';
import { type SenderEvent } from '../ipc/ipc-sender.util';
import { registerPluginHandlers } from './plugin-handlers.util';
import { createPluginRegistry, type PluginRegistry } from './plugin-registry.service';

const APP_ORIGIN = 'zmt://renderer';

function trusted(): SenderEvent {
  return { senderFrame: { parent: null, url: `${APP_ORIGIN}/` } };
}

describe('registerPluginHandlers', () => {
  let registry: PluginRegistry;
  let listener: RawIpcListener;

  beforeEach(() => {
    vi.mocked(ipcMain.handle).mockReset();
    registry = createPluginRegistry();
    registerPluginHandlers({ appOrigin: APP_ORIGIN, pluginRegistry: registry });
    const call = vi.mocked(ipcMain.handle).mock.calls[0];
    expect(call?.[0]).toBe(IPC_CHANNELS.plugins.list);
    listener = call?.[1] as unknown as RawIpcListener;
  });

  it('returns the registry contents in an ok envelope', async () => {
    registry.register({
      displayName: 'Hearts of Iron IV',
      features: [{ enabled: true, featureId: FEATURE_IDS.aircraft, label: 'Aircraft' }],
      gameId: GAME_IDS.hoi4,
    });
    await expect(listener(trusted(), undefined)).resolves.toEqual({
      data: [
        {
          displayName: 'Hearts of Iron IV',
          features: [{ enabled: true, featureId: 'aircraft', label: 'Aircraft' }],
          gameId: 'hoi4',
        },
      ],
      ok: true,
    });
  });

  it('returns an empty list when nothing is registered', async () => {
    await expect(listener(trusted(), undefined)).resolves.toEqual({ data: [], ok: true });
  });

  it('rejects a request payload the contract does not allow', async () => {
    await expect(listener(trusted(), { gameId: 'hoi4' })).resolves.toMatchObject({
      error: { code: 400 },
      ok: false,
    });
  });
});
