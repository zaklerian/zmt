import { IPC_CHANNELS } from '@zmt/contracts';
import { ipcRenderer } from 'electron';

import { invoke } from './ipc-invoke.util';

describe('invoke', () => {
  beforeEach(() => {
    vi.mocked(ipcRenderer.invoke).mockReset();
  });

  it('sends the channel and request object and returns the frozen ok envelope', async () => {
    vi.mocked(ipcRenderer.invoke).mockResolvedValue({ data: 'pong', ok: true });
    const result = await invoke(IPC_CHANNELS.system.ping, undefined);
    expect(ipcRenderer.invoke).toHaveBeenCalledExactlyOnceWith('system:ping', undefined);
    expect(result).toEqual({ data: 'pong', ok: true });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('passes request objects through untouched', async () => {
    vi.mocked(ipcRenderer.invoke).mockResolvedValue({ data: null, ok: true });
    const request = { content: 'body', path: '/root/a.txt' };
    await invoke(IPC_CHANNELS.fs.writeTextFile, request);
    expect(ipcRenderer.invoke).toHaveBeenCalledExactlyOnceWith('fs:writeTextFile', request);
  });

  it('returns a fail envelope from main as is', async () => {
    vi.mocked(ipcRenderer.invoke).mockResolvedValue({
      error: { code: 403, message: 'outside root' },
      ok: false,
    });
    await expect(invoke(IPC_CHANNELS.fs.readTextFile, { path: '/x' })).resolves.toEqual({
      error: { code: 403, message: 'outside root' },
      ok: false,
    });
  });

  it('maps a transport rejection to a 500 envelope instead of throwing', async () => {
    vi.mocked(ipcRenderer.invoke).mockRejectedValue(new Error('No handler registered'));
    await expect(invoke(IPC_CHANNELS.system.ping, undefined)).resolves.toEqual({
      error: { code: 500, message: 'IPC transport failed for system:ping' },
      ok: false,
    });
  });

  it('maps a response outside the contract to a 500 envelope', async () => {
    vi.mocked(ipcRenderer.invoke).mockResolvedValue({ data: 'pang', ok: true });
    await expect(invoke(IPC_CHANNELS.system.ping, undefined)).resolves.toEqual({
      error: { code: 500, message: 'Malformed response for system:ping' },
      ok: false,
    });
    vi.mocked(ipcRenderer.invoke).mockResolvedValue('pong');
    await expect(invoke(IPC_CHANNELS.system.ping, undefined)).resolves.toMatchObject({
      error: { code: 500 },
      ok: false,
    });
  });
});
