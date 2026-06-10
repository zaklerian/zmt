import { EntityDeleteRequest, EntityWriteRequest } from '../entity';
import { EquipmentEntity } from '../equipment';
import { FsNode, ListOptions } from '../fs';
import { GamePlugin } from '../plugin';
import { PreferenceKey, Preferences } from '../preferences';
import { ModId, Workspace } from '../workspace';

export interface AppApiModel {
  readonly entity: {
    readonly delete: (request: EntityDeleteRequest) => Promise<void>;
    readonly write: (request: EntityWriteRequest) => Promise<void>;
  };
  readonly equipment: {
    readonly list: (filePath: string) => Promise<readonly EquipmentEntity[]>;
  };
  readonly fs: {
    readonly listDirectory: (
      path: string,
      options?: ListOptions,
    ) => Promise<readonly FsNode[]>;
    readonly openFolderDialog: () => Promise<null | string>;
    readonly readTextFile: (path: string) => Promise<string>;
    readonly searchFiles: (
      root: string,
      query: string,
      options?: ListOptions,
    ) => Promise<readonly FsNode[]>;
    readonly writeBinaryFile: (
      path: string,
      content: Readonly<Uint8Array>,
    ) => Promise<void>;
    readonly writeTextFile: (path: string, content: string) => Promise<void>;
  };
  readonly plugins: {
    readonly list: () => Promise<readonly GamePlugin[]>;
  };
  readonly preferences: {
    readonly get: <K extends PreferenceKey>(
      key: K,
    ) => Promise<null | Preferences[K]>;
    readonly getAll: () => Promise<Preferences>;
    readonly set: <K extends PreferenceKey>(
      key: K,
      value: null | Preferences[K],
    ) => Promise<void>;
  };
  readonly system: {
    readonly ping: () => Promise<string>;
  };
  readonly workspace: {
    readonly addMod: (path: string) => Promise<Workspace>;
    readonly get: () => Promise<Workspace>;
    readonly removeMod: (id: ModId) => Promise<Workspace>;
  };
}
