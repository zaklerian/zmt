import { AssetImageResult } from '../asset';
import { CharacterEntity } from '../character';
import {
  EntityBatchWriteRequest,
  EntityDeleteRequest,
  EntityWriteRequest,
} from '../entity';
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
import { LocalisationLookupResult } from '../localisation';
import { CatalogModule, ModuleEntity } from '../module';
import { GamePlugin } from '../plugin';
import { PreferenceKey, Preferences } from '../preferences';
import { StateEntity } from '../state';
import { TechTreeGeometry } from '../tech-tree-geometry';
import { TechnologyDeletePlanResult, TechnologyEntity } from '../technology';
import { ModId, Workspace } from '../workspace';

export interface AppApiModel {
  // `asset:image` (ZMT-40) — sprite name → decoded PNG `data:` URL. Main decodes
  // the resolved `.dds` (ZMT-39 resolves the path); the renderer receives pixels
  // keyed by sprite name, never a file path. Three outcomes carried in the result
  // union, not the error channel: `ok`/`unresolved`/`unsupported`.
  readonly asset: {
    readonly getImage: (spriteName: string) => Promise<AssetImageResult>;
  };
  readonly character: {
    readonly list: (filePath: string) => Promise<readonly CharacterEntity[]>;
  };
  readonly entity: {
    readonly delete: (request: EntityDeleteRequest) => Promise<void>;
    readonly write: (request: EntityWriteRequest) => Promise<void>;
    // The ADR 027 cross-file atomic batch (ADR 028 decision 1). Additional to
    // `write`, which the six other entity forms and the mod descriptor keep.
    readonly writeBatch: (request: EntityBatchWriteRequest) => Promise<void>;
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
  // `localisation:lookup` — current loc values for a key set, each with the file
  // that owns it, plus the default insert target (the ADR 028 decision 6 seam).
  // Read-only; loc WRITES ride the `entity:writeBatch` channel so they stay atomic
  // with the script edit they accompany.
  readonly localisation: {
    readonly lookup: (
      keys: readonly string[],
    ) => Promise<LocalisationLookupResult>;
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
    // `technology:deletePlan` — what deleting this technology would remove, for
    // both modes, computed main-side from the entity index's edge graph (ZMT-52).
    // A READ: it computes and returns; the delete itself rides `entity:writeBatch`
    // so the script and localisation halves stay atomic (ADR 028 decision 1).
    readonly deletePlan: (id: string) => Promise<TechnologyDeletePlanResult>;
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
