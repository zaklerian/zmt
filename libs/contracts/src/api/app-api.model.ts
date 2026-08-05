import { CharacterEntity } from '../character';
import { EntityDeleteRequest, EntityWriteRequest } from '../entity';
import {
  IndexDetailResult,
  IndexEntityType,
  IndexListResult,
} from '../entity-index';
import {
  EquipmentEntity,
  EquipmentSlotsRequest,
  EquipmentSlotsResult,
} from '../equipment';
import { FsNode, ListOptions } from '../fs';
import { IdeologyEntity } from '../ideology';
import { CatalogModule, ModuleEntity } from '../module';
import { GamePlugin } from '../plugin';
import { PreferenceKey, Preferences } from '../preferences';
import { StateEntity } from '../state';
import { TechTreeGeometry } from '../tech-tree-geometry';
import { TechnologyEntity } from '../technology';
import { ModId, Workspace } from '../workspace';

export interface AppApiModel {
  readonly character: {
    readonly list: (filePath: string) => Promise<readonly CharacterEntity[]>;
  };
  readonly entity: {
    readonly delete: (request: EntityDeleteRequest) => Promise<void>;
    readonly write: (request: EntityWriteRequest) => Promise<void>;
  };
  readonly equipment: {
    readonly list: (filePath: string) => Promise<readonly EquipmentEntity[]>;
    readonly slots: (
      request: EquipmentSlotsRequest,
    ) => Promise<EquipmentSlotsResult>;
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
  readonly ideology: {
    readonly list: (filePath: string) => Promise<readonly IdeologyEntity[]>;
  };
  // The source-scoped read layer (ADR 024). `entityType` discriminates the
  // row/detail type at this boundary — no `unknown` reaches the renderer.
  readonly index: {
    readonly detail: <K extends IndexEntityType>(
      entityType: K,
      id: string,
    ) => Promise<IndexDetailResult<K>>;
    readonly list: <K extends IndexEntityType>(
      entityType: K,
    ) => Promise<IndexListResult<K>>;
  };
  readonly module: {
    readonly catalog: () => Promise<readonly CatalogModule[]>;
    readonly list: (filePath: string) => Promise<readonly ModuleEntity[]>;
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
  readonly state: {
    readonly list: (filePath: string) => Promise<readonly StateEntity[]>;
  };
  readonly system: {
    readonly ping: () => Promise<string>;
  };
  readonly technology: {
    readonly list: (filePath: string) => Promise<readonly TechnologyEntity[]>;
  };
  // Tech-tree geometry — the folder-keyed render geometry projected from the
  // tree-view `.gui` (ADR 025). A standalone resolved-file read, not the entity
  // index: one channel returning every folder's geometry; the canvas selects one.
  readonly techTreeGeometry: {
    readonly read: () => Promise<TechTreeGeometry>;
  };
  readonly workspace: {
    readonly addMod: (path: string) => Promise<Workspace>;
    readonly get: () => Promise<Workspace>;
    readonly removeMod: (id: ModId) => Promise<Workspace>;
  };
}
