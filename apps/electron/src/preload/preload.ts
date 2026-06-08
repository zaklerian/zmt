import {
  AppApiModel,
  GamePlugin,
  IPC_CHANNELS,
  ModId,
  PreferenceKey,
  Preferences,
  Workspace,
} from '@contracts';
import { contextBridge } from 'electron';

import { invokeStructured } from './ipc-invoke.util';

const API = {
  fs: {
    listDirectory: (path: string) =>
      invokeStructured(IPC_CHANNELS.fs.listDirectory, path),
    openFolderDialog: () =>
      invokeStructured<null | string>(IPC_CHANNELS.fs.openFolderDialog),
    readTextFile: (path: string) =>
      invokeStructured<string>(IPC_CHANNELS.fs.readTextFile, path),
    searchFiles: (root: string, query: string) =>
      invokeStructured(IPC_CHANNELS.fs.searchFiles, root, query),
    writeBinaryFile: (path: string, content: Readonly<Uint8Array>) =>
      invokeStructured<void>(IPC_CHANNELS.fs.writeBinaryFile, path, content),
    writeTextFile: (path: string, content: string) =>
      invokeStructured<void>(IPC_CHANNELS.fs.writeTextFile, path, content),
  },
  plugins: {
    list: () => invokeStructured<GamePlugin[]>(IPC_CHANNELS.plugins.list),
  },
  preferences: {
    get: <K extends PreferenceKey>(key: K) =>
      invokeStructured<null | Preferences[K]>(
        IPC_CHANNELS.preferences.get,
        key,
      ),
    getAll: () =>
      invokeStructured<Preferences>(IPC_CHANNELS.preferences.getAll),
    set: <K extends PreferenceKey>(key: K, value: null | Preferences[K]) =>
      invokeStructured<void>(IPC_CHANNELS.preferences.set, key, value),
  },
  system: {
    ping: () => invokeStructured<string>(IPC_CHANNELS.system.ping),
  },
  workspace: {
    closeMod: (id: ModId) =>
      invokeStructured<Workspace>(IPC_CHANNELS.workspace.closeMod, id),
    get: () => invokeStructured<Workspace>(IPC_CHANNELS.workspace.get),
    openMod: (path: string) =>
      invokeStructured<Workspace>(IPC_CHANNELS.workspace.openMod, path),
  },
} satisfies AppApiModel;

contextBridge.exposeInMainWorld('api', API);
