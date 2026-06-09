import {
  FsNode,
  IPC_CHANNELS,
  IPC_ERROR_CODES,
  IpcError,
  ListOptions,
} from '@contracts';
import { BrowserWindow, dialog } from 'electron';

import {
  listDirectory,
  readTextFile,
  searchFiles,
  writeFileService,
} from '../fs';
import { ipcHandle } from '../ipc';

export function registerFsHandlers(): void {
  ipcHandle<null | string>(IPC_CHANNELS.fs.openFolderDialog, async (event) => {
    const parent = BrowserWindow.fromWebContents(event.sender);
    const result = parent
      ? await dialog.showOpenDialog(parent, { properties: ['openDirectory'] })
      : await dialog.showOpenDialog({ properties: ['openDirectory'] });

    if (result.canceled || result.filePaths.length === 0) return null;

    const [chosen] = result.filePaths;
    return chosen;
  });

  ipcHandle<FsNode[]>(
    IPC_CHANNELS.fs.listDirectory,
    async (_event, rawPath, rawOptions) => {
      const target = requireString(rawPath, 'path');
      return listDirectory(target, coerceListOptions(rawOptions));
    },
  );

  ipcHandle<FsNode[]>(
    IPC_CHANNELS.fs.searchFiles,
    async (_event, rawRoot, rawQuery, rawOptions) => {
      const root = requireString(rawRoot, 'root');
      const query = requireString(rawQuery, 'query');
      return searchFiles(root, query, coerceListOptions(rawOptions));
    },
  );

  ipcHandle<string>(IPC_CHANNELS.fs.readTextFile, async (_event, rawPath) => {
    const target = requireString(rawPath, 'path');
    return readTextFile(target);
  });

  ipcHandle<void>(
    IPC_CHANNELS.fs.writeTextFile,
    async (_event, rawPath, rawContent) => {
      const target = requireString(rawPath, 'path');
      if (typeof rawContent !== 'string') {
        throw {
          code: IPC_ERROR_CODES.BAD_REQUEST,
          message: 'content must be a string',
        } satisfies IpcError;
      }
      await writeFileService.writeText(target, rawContent);
    },
  );

  ipcHandle<void>(
    IPC_CHANNELS.fs.writeBinaryFile,
    async (_event, rawPath, rawContent) => {
      const target = requireString(rawPath, 'path');
      if (!(rawContent instanceof Uint8Array)) {
        throw {
          code: IPC_ERROR_CODES.BAD_REQUEST,
          message: 'content must be a Uint8Array',
        } satisfies IpcError;
      }
      await writeFileService.writeBinary(target, rawContent);
    },
  );
}

function coerceListOptions(value: unknown): ListOptions {
  const hideUnsupportedFiles =
    typeof value === 'object' &&
    value !== null &&
    (value as Record<string, unknown>).hideUnsupportedFiles === true;
  return { hideUnsupportedFiles };
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw {
      code: IPC_ERROR_CODES.BAD_REQUEST,
      message: `${field} must be a string`,
    } satisfies IpcError;
  }
  return value;
}
