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
  IdeologyEntity,
  IndexDetailResult,
  IndexEntityType,
  IndexListResult,
  IPC_CHANNELS,
  ListOptions,
  ModId,
  ModuleEntity,
  PreferenceKey,
  Preferences,
  StateEntity,
  TechnologyEntity,
  TechTreeGeometry,
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
  ideology: {
    list: (filePath: string) =>
      invokeStructured<readonly IdeologyEntity[]>(
        IPC_CHANNELS.ideology.list,
        filePath,
      ),
  },
  index: {
    detail: <K extends IndexEntityType>(entityType: K, id: string) =>
      invokeStructured<IndexDetailResult<K>>(
        IPC_CHANNELS.index.detail,
        entityType,
        id,
      ),
    list: <K extends IndexEntityType>(entityType: K) =>
      invokeStructured<IndexListResult<K>>(IPC_CHANNELS.index.list, entityType),
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
  state: {
    list: (filePath: string) =>
      invokeStructured<readonly StateEntity[]>(
        IPC_CHANNELS.state.list,
        filePath,
      ),
  },
  system: {
    ping: () => invokeStructured<string>(IPC_CHANNELS.system.ping),
  },
  technology: {
    list: (filePath: string) =>
      invokeStructured<readonly TechnologyEntity[]>(
        IPC_CHANNELS.technology.list,
        filePath,
      ),
  },
  techTreeGeometry: {
    read: () =>
      invokeStructured<TechTreeGeometry>(IPC_CHANNELS.techTreeGeometry.read),
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
