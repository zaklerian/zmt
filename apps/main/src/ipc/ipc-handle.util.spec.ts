import { IPC_CHANNELS, type IpcChannel } from '@zmt/contracts';
import { ipcMain } from 'electron';

import { IpcFailure } from './ipc-failure.model';
import { createIpcListener, ipcHandle, type RawIpcListener, toFailure } from './ipc-handle.util';
import { type SenderEvent } from './ipc-sender.util';

const APP_ORIGIN = 'zmt://renderer';
const OPTIONS = { appOrigin: APP_ORIGIN } as const;

function trusted(url = `${APP_ORIGIN}/index.html`): SenderEvent {
  return { senderFrame: { parent: null, url } };
}

describe('createIpcListener', () => {
  it('parses the request, freezes the payload and wraps the response in an ok envelope', async () => {
    const handler = vi.fn(async (payload: { readonly path: string }) => {
      expect(Object.isFrozen(payload)).toBe(true);
      return Promise.resolve(`read ${payload.path}`);
    });
    const listener = createIpcListener(IPC_CHANNELS.fs.readTextFile, handler, OPTIONS);
    const result = await listener(trusted(), { path: '/root/a.txt' });
    expect(result).toEqual({ data: 'read /root/a.txt', ok: true });
    expect(Object.isFrozen(result)).toBe(true);
    expect(handler).toHaveBeenCalledWith({ path: '/root/a.txt' }, trusted());
  });

  it('applies schema defaults before the handler sees the payload', async () => {
    const handler = vi.fn(async () => Promise.resolve([]));
    const listener = createIpcListener(IPC_CHANNELS.fs.listDirectory, handler, OPTIONS);
    await listener(trusted(), { path: '/root' });
    expect(handler).toHaveBeenCalledWith(
      { options: { hideUnsupportedFiles: false }, path: '/root' },
      trusted(),
    );
  });

  it('rejects an untrusted sender with 403 before parsing or calling the handler', async () => {
    const handler = vi.fn(async () => Promise.resolve('pong' as const));
    const listener = createIpcListener(IPC_CHANNELS.system.ping, handler, OPTIONS);
    await expect(listener({ senderFrame: null }, undefined)).resolves.toEqual({
      error: { code: 403, message: 'Untrusted sender' },
      ok: false,
    });
    await expect(listener(trusted('https://evil.example/'), undefined)).resolves.toMatchObject({
      ok: false,
    });
    await expect(
      listener(
        { senderFrame: { parent: { parent: null, url: `${APP_ORIGIN}/` }, url: `${APP_ORIGIN}/` } },
        undefined,
      ),
    ).resolves.toMatchObject({ error: { code: 403 }, ok: false });
    expect(handler).not.toHaveBeenCalled();
  });

  it('rejects a malformed request with 400 and never calls the handler', async () => {
    const handler = vi.fn(async () => Promise.resolve('text'));
    const listener = createIpcListener(IPC_CHANNELS.fs.readTextFile, handler, OPTIONS);
    await expect(listener(trusted(), { path: 42 })).resolves.toEqual({
      error: { code: 400, message: 'Invalid request for fs:readTextFile' },
      ok: false,
    });
    await expect(listener(trusted(), undefined)).resolves.toMatchObject({ ok: false });
    expect(handler).not.toHaveBeenCalled();
  });

  it('maps a thrown IpcFailure to its code and message', async () => {
    const listener = createIpcListener(
      IPC_CHANNELS.fs.readTextFile,
      async () => Promise.reject(new IpcFailure(404, 'File not found: /root/a.txt')),
      OPTIONS,
    );
    await expect(listener(trusted(), { path: '/root/a.txt' })).resolves.toEqual({
      error: { code: 404, message: 'File not found: /root/a.txt' },
      ok: false,
    });
    expect(console.error).not.toHaveBeenCalled();
  });

  it('maps an unexpected error to 500 without leaking its message', async () => {
    const listener = createIpcListener(
      IPC_CHANNELS.fs.readTextFile,
      async () => Promise.reject(new Error('ENOMEM secret detail')),
      OPTIONS,
    );
    await expect(listener(trusted(), { path: '/root/a.txt' })).resolves.toEqual({
      error: { code: 500, message: 'Internal error' },
      ok: false,
    });
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('maps a handler response outside the contract to 500', async () => {
    const listener = createIpcListener(
      IPC_CHANNELS.system.ping,
      async () => Promise.resolve('pang' as 'pong'),
      OPTIONS,
    );
    await expect(listener(trusted(), undefined)).resolves.toEqual({
      error: { code: 500, message: 'Internal error' },
      ok: false,
    });
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('never throws across the boundary', async () => {
    const listener = createIpcListener(
      IPC_CHANNELS.system.ping,
      (): Promise<never> => {
        throw new Error('sync-ish');
      },
      OPTIONS,
    );
    await expect(listener(trusted(), undefined)).resolves.toMatchObject({ ok: false });
  });
});

describe('toFailure', () => {
  it('keeps IpcFailure details and hides everything else', () => {
    expect(toFailure('system:ping', new IpcFailure(409, 'dup'))).toEqual({
      error: { code: 409, message: 'dup' },
      ok: false,
    });
    expect(toFailure('system:ping', 'boom')).toEqual({
      error: { code: 500, message: 'Internal error' },
      ok: false,
    });
  });
});

describe('ipcHandle', () => {
  beforeEach(() => {
    vi.mocked(ipcMain.handle).mockReset();
  });

  it('registers exactly one ipcMain listener per channel that runs the typed listener', async () => {
    ipcHandle(IPC_CHANNELS.system.ping, async () => Promise.resolve('pong' as const), OPTIONS);
    expect(ipcMain.handle).toHaveBeenCalledTimes(1);
    const [channel, raw] = vi.mocked(ipcMain.handle).mock.calls[0] as unknown as [
      IpcChannel,
      RawIpcListener,
    ];
    expect(channel).toBe('system:ping');
    await expect(raw(trusted(), undefined)).resolves.toEqual({ data: 'pong', ok: true });
  });
});
