import { IPC_CHANNELS } from '@contracts';
import { ipcMain } from 'electron';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getCapturedHandler,
  makeInvokeEvent,
} from './__test-utils__/capture-ipc-handler';
import { registerSystemHandlers } from './system-handlers.setup';

describe('registerSystemHandlers', () => {
  beforeEach(() => {
    vi.mocked(ipcMain.handle).mockReset();
    registerSystemHandlers();
  });

  it('registers a handler for the system:ping channel', () => {
    expect(ipcMain.handle).toHaveBeenCalledWith(
      IPC_CHANNELS.system.ping,
      expect.any(Function),
    );
  });

  it('responds with "pong" to a ping invocation', async () => {
    const handler = getCapturedHandler(IPC_CHANNELS.system.ping);
    await expect(handler(makeInvokeEvent())).resolves.toBe('pong');
  });
});
