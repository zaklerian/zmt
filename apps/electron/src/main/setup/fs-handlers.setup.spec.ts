import { FILE_SUPPORT, FsNode, IPC_CHANNELS } from '@contracts';
import { BrowserWindow, dialog, ipcMain } from 'electron';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  listDirectory,
  readTextFile,
  rootStateService,
  searchFiles,
  writeFileService,
} from '../fs';
import {
  extractIpcError,
  getCapturedHandler,
  makeInvokeEvent,
} from './__test-utils__/capture-ipc-handler';
import { registerFsHandlers } from './fs-handlers.setup';

vi.mock('../fs', () => ({
  listDirectory: vi.fn(),
  readTextFile: vi.fn(),
  rootStateService: {
    get: vi.fn(),
    set: vi.fn(),
  },
  searchFiles: vi.fn(),
  writeFileService: {
    writeBinary: vi.fn(),
    writeText: vi.fn(),
  },
}));

const fakeNode: FsNode = {
  extension: '.txt',
  hasChildren: false,
  name: 'readme.txt',
  path: '/root/readme.txt',
  support: FILE_SUPPORT.editable,
  type: 'file',
};

describe('registerFsHandlers', () => {
  beforeEach(() => {
    vi.mocked(ipcMain.handle).mockReset();
    vi.mocked(BrowserWindow.fromWebContents).mockReset();
    vi.mocked(dialog.showOpenDialog).mockReset();
    vi.mocked(listDirectory).mockReset();
    vi.mocked(readTextFile).mockReset();
    vi.mocked(rootStateService.get).mockReset();
    vi.mocked(rootStateService.set).mockReset();
    vi.mocked(searchFiles).mockReset();
    vi.mocked(writeFileService.writeBinary).mockReset();
    vi.mocked(writeFileService.writeText).mockReset();
    registerFsHandlers();
  });

  describe('fs:openFolderDialog', () => {
    it('returns the chosen folder and stores it as the new root', async () => {
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(
        null as unknown as BrowserWindow,
      );
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: false,
        filePaths: ['/picked/folder'],
      });

      const handler = getCapturedHandler(IPC_CHANNELS.fs.openFolderDialog);
      await expect(handler(makeInvokeEvent())).resolves.toBe('/picked/folder');
      expect(rootStateService.set).toHaveBeenCalledWith('/picked/folder');
    });

    it('returns null and does not touch the root state when the user cancels', async () => {
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(
        null as unknown as BrowserWindow,
      );
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: true,
        filePaths: [],
      });

      const handler = getCapturedHandler(IPC_CHANNELS.fs.openFolderDialog);
      await expect(handler(makeInvokeEvent())).resolves.toBeNull();
      expect(rootStateService.set).not.toHaveBeenCalled();
    });

    it('returns null and does not touch the root state when no path is returned', async () => {
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(
        null as unknown as BrowserWindow,
      );
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: false,
        filePaths: [],
      });

      const handler = getCapturedHandler(IPC_CHANNELS.fs.openFolderDialog);
      await expect(handler(makeInvokeEvent())).resolves.toBeNull();
      expect(rootStateService.set).not.toHaveBeenCalled();
    });
  });

  describe('fs:getCurrentRoot', () => {
    it('returns whatever root-state reports', async () => {
      vi.mocked(rootStateService.get).mockReturnValue('/current/root');
      const handler = getCapturedHandler(IPC_CHANNELS.fs.getCurrentRoot);
      await expect(handler(makeInvokeEvent())).resolves.toBe('/current/root');
    });

    it('returns null when no root is open', async () => {
      vi.mocked(rootStateService.get).mockReturnValue(null);
      const handler = getCapturedHandler(IPC_CHANNELS.fs.getCurrentRoot);
      await expect(handler(makeInvokeEvent())).resolves.toBeNull();
    });
  });

  describe('fs:listDirectory', () => {
    it('passes the path through to the list-directory service', async () => {
      vi.mocked(listDirectory).mockResolvedValue([fakeNode]);
      const handler = getCapturedHandler(IPC_CHANNELS.fs.listDirectory);
      await expect(handler(makeInvokeEvent(), '/root/sub')).resolves.toEqual([
        fakeNode,
      ]);
      expect(listDirectory).toHaveBeenCalledWith('/root/sub');
    });

    it('rejects with code 400 when path is not a string', async () => {
      const handler = getCapturedHandler(IPC_CHANNELS.fs.listDirectory);
      await expect(handler(makeInvokeEvent(), 42)).rejects.toSatisfy(
        (error) => extractIpcError(error).code === 400,
      );
      expect(listDirectory).not.toHaveBeenCalled();
    });

    it('propagates a 403 from the service through the wrapper', async () => {
      vi.mocked(listDirectory).mockRejectedValue({
        code: 403,
        message: 'Path is outside the approved root',
      });
      const handler = getCapturedHandler(IPC_CHANNELS.fs.listDirectory);
      await expect(handler(makeInvokeEvent(), '/elsewhere')).rejects.toSatisfy(
        (error) => extractIpcError(error).code === 403,
      );
    });

    it('propagates a 404 from the service through the wrapper', async () => {
      vi.mocked(listDirectory).mockRejectedValue({
        code: 404,
        message: 'Directory not found',
      });
      const handler = getCapturedHandler(IPC_CHANNELS.fs.listDirectory);
      await expect(
        handler(makeInvokeEvent(), '/root/missing'),
      ).rejects.toSatisfy((error) => extractIpcError(error).code === 404);
    });

    it('wraps a non-IpcError service failure as code 500', async () => {
      vi.mocked(listDirectory).mockRejectedValue(new Error('ENOMEM'));
      const handler = getCapturedHandler(IPC_CHANNELS.fs.listDirectory);
      await expect(handler(makeInvokeEvent(), '/root')).rejects.toSatisfy(
        (error) => extractIpcError(error).code === 500,
      );
    });
  });

  describe('fs:searchFiles', () => {
    it('passes both root and query through to the search service', async () => {
      vi.mocked(searchFiles).mockResolvedValue([fakeNode]);
      const handler = getCapturedHandler(IPC_CHANNELS.fs.searchFiles);
      await expect(
        handler(makeInvokeEvent(), '/root', 'readme'),
      ).resolves.toEqual([fakeNode]);
      expect(searchFiles).toHaveBeenCalledWith('/root', 'readme');
    });

    it('rejects with code 400 when root is not a string', async () => {
      const handler = getCapturedHandler(IPC_CHANNELS.fs.searchFiles);
      await expect(
        handler(makeInvokeEvent(), null, 'readme'),
      ).rejects.toSatisfy((error) => extractIpcError(error).code === 400);
    });

    it('rejects with code 400 when query is not a string', async () => {
      const handler = getCapturedHandler(IPC_CHANNELS.fs.searchFiles);
      await expect(
        handler(makeInvokeEvent(), '/root', undefined),
      ).rejects.toSatisfy((error) => extractIpcError(error).code === 400);
    });
  });

  describe('fs:readTextFile', () => {
    it('returns the contents from the read-file service', async () => {
      vi.mocked(readTextFile).mockResolvedValue('hello');
      const handler = getCapturedHandler(IPC_CHANNELS.fs.readTextFile);
      await expect(handler(makeInvokeEvent(), '/root/a.txt')).resolves.toBe(
        'hello',
      );
    });

    it('rejects with code 400 when path is not a string', async () => {
      const handler = getCapturedHandler(IPC_CHANNELS.fs.readTextFile);
      await expect(handler(makeInvokeEvent(), 0)).rejects.toSatisfy(
        (error) => extractIpcError(error).code === 400,
      );
    });

    it('propagates a 413 (PAYLOAD_TOO_LARGE) from the service', async () => {
      vi.mocked(readTextFile).mockRejectedValue({
        code: 413,
        message: 'File exceeds limit',
      });
      const handler = getCapturedHandler(IPC_CHANNELS.fs.readTextFile);
      await expect(
        handler(makeInvokeEvent(), '/root/huge.txt'),
      ).rejects.toSatisfy((error) => extractIpcError(error).code === 413);
    });
  });

  describe('fs:writeTextFile', () => {
    it('writes through to the writeFileService', async () => {
      vi.mocked(writeFileService.writeText).mockResolvedValue();
      const handler = getCapturedHandler(IPC_CHANNELS.fs.writeTextFile);
      await handler(makeInvokeEvent(), '/root/out.txt', 'body');
      expect(writeFileService.writeText).toHaveBeenCalledWith(
        '/root/out.txt',
        'body',
      );
    });

    it('rejects with code 400 when path is not a string', async () => {
      const handler = getCapturedHandler(IPC_CHANNELS.fs.writeTextFile);
      await expect(handler(makeInvokeEvent(), 42, 'body')).rejects.toSatisfy(
        (error) => extractIpcError(error).code === 400,
      );
      expect(writeFileService.writeText).not.toHaveBeenCalled();
    });

    it('rejects with code 400 when content is not a string', async () => {
      const handler = getCapturedHandler(IPC_CHANNELS.fs.writeTextFile);
      await expect(
        handler(makeInvokeEvent(), '/root/out.txt', 123),
      ).rejects.toSatisfy((error) => extractIpcError(error).code === 400);
      expect(writeFileService.writeText).not.toHaveBeenCalled();
    });

    it('propagates a 413 (PAYLOAD_TOO_LARGE) from the service', async () => {
      vi.mocked(writeFileService.writeText).mockRejectedValue({
        code: 413,
        message: 'Payload exceeds limit',
      });
      const handler = getCapturedHandler(IPC_CHANNELS.fs.writeTextFile);
      await expect(
        handler(makeInvokeEvent(), '/root/out.txt', 'body'),
      ).rejects.toSatisfy((error) => extractIpcError(error).code === 413);
    });
  });

  describe('fs:writeBinaryFile', () => {
    it('writes binary content through to the writeFileService', async () => {
      vi.mocked(writeFileService.writeBinary).mockResolvedValue();
      const handler = getCapturedHandler(IPC_CHANNELS.fs.writeBinaryFile);
      const payload = new Uint8Array([1, 2, 3]);
      await handler(makeInvokeEvent(), '/root/out.bin', payload);
      expect(writeFileService.writeBinary).toHaveBeenCalledWith(
        '/root/out.bin',
        payload,
      );
    });

    it('rejects with code 400 when content is not a Uint8Array', async () => {
      const handler = getCapturedHandler(IPC_CHANNELS.fs.writeBinaryFile);
      await expect(
        handler(makeInvokeEvent(), '/root/out.bin', 'not bytes'),
      ).rejects.toSatisfy((error) => extractIpcError(error).code === 400);
      expect(writeFileService.writeBinary).not.toHaveBeenCalled();
    });

    it('rejects with code 400 when path is not a string', async () => {
      const handler = getCapturedHandler(IPC_CHANNELS.fs.writeBinaryFile);
      await expect(
        handler(makeInvokeEvent(), null, new Uint8Array()),
      ).rejects.toSatisfy((error) => extractIpcError(error).code === 400);
    });

    it('wraps a non-IpcError service failure as code 500', async () => {
      vi.mocked(writeFileService.writeBinary).mockRejectedValue(
        new Error('disk full'),
      );
      const handler = getCapturedHandler(IPC_CHANNELS.fs.writeBinaryFile);
      await expect(
        handler(makeInvokeEvent(), '/root/out.bin', new Uint8Array([1])),
      ).rejects.toSatisfy((error) => extractIpcError(error).code === 500);
    });
  });
});
