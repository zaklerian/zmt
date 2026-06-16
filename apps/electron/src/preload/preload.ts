import {
  AppApiModel,
  CatalogModule,
  CharacterEntity,
  EntityDeleteRequest,
  EntityWriteRequest,
  EquipmentEntity,
  EquipmentSlotsRequest,
  EquipmentSlotsResult,
  GamePlugin,
  IPC_CHANNELS,
  ListOptions,
  ModId,
  ModuleEntity,
  PreferenceKey,
  Preferences,
  Workspace,
} from '@contracts';
import { contextBridge } from 'electron';

import { invokeStructured } from './ipc-invoke.util';

const API = {
  character: {
    list: (filePath: string) =>
      invokeStructured<readonly CharacterEntity[]>(
        IPC_CHANNELS.character.list,
        filePath,
      ),
  },
  entity: {
    delete: (request: EntityDeleteRequest) =>
      invokeStructured<void>(IPC_CHANNELS.entity.delete, request),
    write: (request: EntityWriteRequest) =>
      invokeStructured<void>(IPC_CHANNELS.entity.write, request),
  },
  equipment: {
    list: (filePath: string) =>
      invokeStructured<readonly EquipmentEntity[]>(
        IPC_CHANNELS.equipment.list,
        filePath,
      ),
    slots: (request: EquipmentSlotsRequest) =>
      invokeStructured<EquipmentSlotsResult>(
        IPC_CHANNELS.equipment.slots,
        request,
      ),
  },
  fs: {
    listDirectory: (path: string, options?: ListOptions) =>
      invokeStructured(IPC_CHANNELS.fs.listDirectory, path, options),
    openFolderDialog: () =>
      invokeStructured<null | string>(IPC_CHANNELS.fs.openFolderDialog),
    readTextFile: (path: string) =>
      invokeStructured<string>(IPC_CHANNELS.fs.readTextFile, path),
    searchFiles: (root: string, query: string, options?: ListOptions) =>
      invokeStructured(IPC_CHANNELS.fs.searchFiles, root, query, options),
    writeBinaryFile: (path: string, content: Readonly<Uint8Array>) =>
      invokeStructured<void>(IPC_CHANNELS.fs.writeBinaryFile, path, content),
    writeTextFile: (path: string, content: string) =>
      invokeStructured<void>(IPC_CHANNELS.fs.writeTextFile, path, content),
  },
  module: {
    catalog: () =>
      invokeStructured<readonly CatalogModule[]>(IPC_CHANNELS.module.catalog),
    list: (filePath: string) =>
      invokeStructured<readonly ModuleEntity[]>(
        IPC_CHANNELS.module.list,
        filePath,
      ),
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
    addMod: (path: string) =>
      invokeStructured<Workspace>(IPC_CHANNELS.workspace.addMod, path),
    get: () => invokeStructured<Workspace>(IPC_CHANNELS.workspace.get),
    removeMod: (id: ModId) =>
      invokeStructured<Workspace>(IPC_CHANNELS.workspace.removeMod, id),
  },
} satisfies AppApiModel;

contextBridge.exposeInMainWorld('api', API);
