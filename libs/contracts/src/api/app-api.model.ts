import { FsNode } from '../fs';
import { GamePlugin } from '../plugin';
import { PreferenceKey, Preferences } from '../preferences';

export interface AppApiModel {
  readonly fs: {
    readonly getCurrentRoot: () => Promise<null | string>;
    readonly listDirectory: (path: string) => Promise<readonly FsNode[]>;
    readonly openFolderDialog: () => Promise<null | string>;
    readonly readTextFile: (path: string) => Promise<string>;
    readonly searchFiles: (
      root: string,
      query: string,
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
}
