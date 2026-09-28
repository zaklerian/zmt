import { IPC_CHANNELS, type IpcChannel } from '@zmt/contracts';
import { BrowserWindow, dialog, ipcMain } from 'electron';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { type RawIpcListener } from '../ipc/ipc-handle.util';
import { type SenderEvent } from '../ipc/ipc-sender.util';
import { type AllowedRoot, createAllowedRoot } from './allowed-root.service';
import { parentWindowOf, pickFolder, registerFsHandlers } from './fs-handlers.util';

const APP_ORIGIN = 'zmt://renderer';

function trusted(): SenderEvent {
  return { senderFrame: { parent: null, url: `${APP_ORIGIN}/index.html` } };
}

function untrusted(): SenderEvent {
  return { senderFrame: { parent: null, url: 'https://evil.example/' } };
}

function listenerFor(channel: IpcChannel): RawIpcListener {
  const call = vi.mocked(ipcMain.handle).mock.calls.find(([name]) => name === channel);
  if (call === undefined) {
    throw new Error(`no handler for ${channel}`);
  }
  return call[1] as unknown as RawIpcListener;
}

describe('registerFsHandlers', () => {
  let root = '';
  let allowedRoot: AllowedRoot;

  beforeEach(async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'zmt-fs-handlers-')));
    await fs.mkdir(path.join(root, 'common'));
    await fs.writeFile(path.join(root, 'common', 'units.txt'), 'units');
    await fs.writeFile(path.join(root, 'descriptor.mod'), 'name="Mod"');
    allowedRoot = createAllowedRoot(root);
    vi.mocked(ipcMain.handle).mockReset();
    vi.mocked(dialog.showOpenDialog).mockReset();
    vi.mocked(BrowserWindow.fromWebContents).mockReset();
    registerFsHandlers({ allowedRoot, appOrigin: APP_ORIGIN });
  });

  afterEach(async () => {
    await fs.rm(root, { force: true, recursive: true });
  });

  it('registers every fs channel', () => {
    const registered = vi.mocked(ipcMain.handle).mock.calls.map(([channel]) => channel);
    expect([...registered].sort()).toEqual([...Object.values(IPC_CHANNELS.fs)].sort());
  });

  describe('fs:openFolderDialog', () => {
    it('returns the chosen folder and makes it the allowed root', async () => {
      const picked = path.join(root, 'common');
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({ canceled: false, filePaths: [picked] });
      await expect(listenerFor('fs:openFolderDialog')(trusted(), undefined)).resolves.toEqual({
        data: picked,
        ok: true,
      });
      expect(allowedRoot.get()).toBe(picked);
    });

    it('returns null and keeps the root when the dialog is cancelled or empty', async () => {
      vi.mocked(dialog.showOpenDialog).mockResolvedValueOnce({ canceled: true, filePaths: [] });
      await expect(listenerFor('fs:openFolderDialog')(trusted(), undefined)).resolves.toEqual({
        data: null,
        ok: true,
      });
      vi.mocked(dialog.showOpenDialog).mockResolvedValueOnce({ canceled: false, filePaths: [] });
      await expect(listenerFor('fs:openFolderDialog')(trusted(), undefined)).resolves.toEqual({
        data: null,
        ok: true,
      });
      expect(allowedRoot.get()).toBe(root);
    });

    it('rejects an untrusted sender without opening a dialog', async () => {
      await expect(
        listenerFor('fs:openFolderDialog')(untrusted(), undefined),
      ).resolves.toMatchObject({
        error: { code: 403 },
        ok: false,
      });
      expect(dialog.showOpenDialog).not.toHaveBeenCalled();
    });
  });

  describe('fs:listDirectory', () => {
    it('lists a directory under the root', async () => {
      const result = await listenerFor('fs:listDirectory')(trusted(), { path: root });
      expect(result).toMatchObject({ ok: true });
      expect(result).toHaveProperty('data.0.name', 'common');
      expect(result).toHaveProperty('data.1.name', 'descriptor.mod');
    });

    it('returns 403 for a path outside the root', async () => {
      await expect(
        listenerFor('fs:listDirectory')(trusted(), { path: os.tmpdir() }),
      ).resolves.toEqual({
        error: { code: 403, message: `Path is outside the allowed root: ${os.tmpdir()}` },
        ok: false,
      });
    });

    it('returns 403 when no root is open', async () => {
      allowedRoot.clear();
      await expect(listenerFor('fs:listDirectory')(trusted(), { path: root })).resolves.toEqual({
        error: { code: 403, message: 'No root folder is open' },
        ok: false,
      });
    });

    it('returns 404 for a missing directory and 400 for a malformed request', async () => {
      await expect(
        listenerFor('fs:listDirectory')(trusted(), { path: path.join(root, 'missing') }),
      ).resolves.toMatchObject({ error: { code: 404 }, ok: false });
      await expect(listenerFor('fs:listDirectory')(trusted(), { path: 42 })).resolves.toMatchObject(
        {
          error: { code: 400 },
          ok: false,
        },
      );
    });
  });

  describe('fs:searchFiles', () => {
    it('searches under the root and honours options', async () => {
      await expect(
        listenerFor('fs:searchFiles')(trusted(), { query: 'units', root }),
      ).resolves.toMatchObject({ data: [{ name: 'units.txt' }], ok: true });
      await expect(
        listenerFor('fs:searchFiles')(trusted(), {
          options: { hideUnsupportedFiles: true },
          query: 'units',
          root,
        }),
      ).resolves.toMatchObject({ data: [{ name: 'units.txt' }], ok: true });
    });

    it('returns 403 outside the root', async () => {
      await expect(
        listenerFor('fs:searchFiles')(trusted(), { query: 'x', root: os.tmpdir() }),
      ).resolves.toMatchObject({ error: { code: 403 }, ok: false });
    });
  });

  describe('fs:readTextFile', () => {
    it('reads a file under the root', async () => {
      await expect(
        listenerFor('fs:readTextFile')(trusted(), { path: path.join(root, 'descriptor.mod') }),
      ).resolves.toEqual({ data: 'name="Mod"', ok: true });
    });

    it('returns 404 for a missing file', async () => {
      await expect(
        listenerFor('fs:readTextFile')(trusted(), { path: path.join(root, 'nope.txt') }),
      ).resolves.toMatchObject({ error: { code: 404 }, ok: false });
    });
  });

  describe('fs:writeTextFile and fs:writeBinaryFile', () => {
    it('writes text and binary under the root', async () => {
      await expect(
        listenerFor('fs:writeTextFile')(trusted(), {
          content: 'new',
          path: path.join(root, 'new.txt'),
        }),
      ).resolves.toEqual({ data: null, ok: true });
      await expect(fs.readFile(path.join(root, 'new.txt'), 'utf8')).resolves.toBe('new');
      await expect(
        listenerFor('fs:writeBinaryFile')(trusted(), {
          content: new Uint8Array([1, 2]),
          path: path.join(root, 'new.bin'),
        }),
      ).resolves.toEqual({ data: null, ok: true });
      await expect(fs.readFile(path.join(root, 'new.bin'))).resolves.toEqual(Buffer.from([1, 2]));
    });

    it('returns 403 outside the root and 400 for bad content', async () => {
      await expect(
        listenerFor('fs:writeTextFile')(trusted(), {
          content: 'x',
          path: path.join(os.tmpdir(), 'escape.txt'),
        }),
      ).resolves.toMatchObject({ error: { code: 403 }, ok: false });
      await expect(
        listenerFor('fs:writeBinaryFile')(trusted(), { content: 'x', path: path.join(root, 'a') }),
      ).resolves.toMatchObject({ error: { code: 400 }, ok: false });
    });
  });
});

describe('pickFolder', () => {
  beforeEach(() => {
    vi.mocked(dialog.showOpenDialog).mockReset();
    vi.mocked(BrowserWindow.fromWebContents).mockReset();
  });

  it('uses the sender window as the dialog parent when it exists', async () => {
    const window = { id: 1 } as unknown as BrowserWindow;
    vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(window);
    vi.mocked(dialog.showOpenDialog).mockResolvedValue({ canceled: false, filePaths: ['/picked'] });
    const event = { sender: {}, senderFrame: null } as unknown as SenderEvent;
    await expect(pickFolder(event)).resolves.toBe('/picked');
    expect(dialog.showOpenDialog).toHaveBeenCalledWith(window, { properties: ['openDirectory'] });
  });

  it('opens an unparented dialog when the sender has no window', async () => {
    vi.mocked(dialog.showOpenDialog).mockResolvedValue({ canceled: false, filePaths: ['/picked'] });
    await expect(pickFolder({ senderFrame: null })).resolves.toBe('/picked');
    expect(dialog.showOpenDialog).toHaveBeenCalledWith({ properties: ['openDirectory'] });
  });

  it('resolves the parent window only from events that carry a sender', () => {
    vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(null);
    expect(parentWindowOf({ senderFrame: null })).toBeNull();
    expect(parentWindowOf({ sender: {}, senderFrame: null } as unknown as SenderEvent)).toBeNull();
    expect(BrowserWindow.fromWebContents).toHaveBeenCalledTimes(1);
  });
});
