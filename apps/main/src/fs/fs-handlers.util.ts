import { IPC_CHANNELS } from '@zmt/contracts';
import { BrowserWindow, dialog } from 'electron';

import { ipcHandle, type IpcHandleOptions } from '../ipc/ipc-handle.util';
import { type SenderEvent } from '../ipc/ipc-sender.util';
import { type AllowedRoot } from './allowed-root.service';
import { listDirectory } from './list-directory.service';
import { readTextFile } from './read-file.service';
import { searchFiles } from './search-files.service';
import { writeBinaryFile, writeTextFile } from './write-file.service';

export interface FsHandlerDependencies extends IpcHandleOptions {
  readonly allowedRoot: AllowedRoot;
}

export function parentWindowOf(event: SenderEvent): BrowserWindow | null {
  if (!('sender' in event)) {
    return null;
  }
  const sender = Reflect.get(event, 'sender');
  return BrowserWindow.fromWebContents(sender as Electron.WebContents);
}

export async function pickFolder(event: SenderEvent): Promise<null | string> {
  const parent = parentWindowOf(event);
  const properties: readonly ['openDirectory'] = ['openDirectory'];
  const result =
    parent === null
      ? await dialog.showOpenDialog({ properties: [...properties] })
      : await dialog.showOpenDialog(parent, { properties: [...properties] });
  const [chosen] = result.filePaths;
  if (result.canceled || chosen === undefined) {
    return null;
  }
  return chosen;
}

export function registerFsHandlers(dependencies: FsHandlerDependencies): void {
  const { allowedRoot } = dependencies;

  ipcHandle(
    IPC_CHANNELS.fs.openFolderDialog,
    async (_payload, event) => {
      const chosen = await pickFolder(event);
      if (chosen !== null) {
        allowedRoot.set(chosen);
      }
      return chosen;
    },
    dependencies,
  );

  ipcHandle(
    IPC_CHANNELS.fs.listDirectory,
    async (payload) => listDirectory(await allowedRoot.guard(payload.path), payload.options),
    dependencies,
  );

  ipcHandle(
    IPC_CHANNELS.fs.searchFiles,
    async (payload) =>
      searchFiles(await allowedRoot.guard(payload.root), payload.query, payload.options),
    dependencies,
  );

  ipcHandle(
    IPC_CHANNELS.fs.readTextFile,
    async (payload) => readTextFile(await allowedRoot.guard(payload.path)),
    dependencies,
  );

  ipcHandle(
    IPC_CHANNELS.fs.writeTextFile,
    async (payload) => {
      await writeTextFile(await allowedRoot.guard(payload.path), payload.content);
      return null;
    },
    dependencies,
  );

  ipcHandle(
    IPC_CHANNELS.fs.writeBinaryFile,
    async (payload) => {
      await writeBinaryFile(await allowedRoot.guard(payload.path), payload.content);
      return null;
    },
    dependencies,
  );
}
