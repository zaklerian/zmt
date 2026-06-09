import { IncludedMod, ModId, Workspace } from '@contracts';
import ElectronStore from 'electron-store';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { basename } from 'node:path';

import { resolveStoreName } from '../preferences';
import { parseWorkspace } from './parse-workspace.util';

const WORKSPACE_KEY = 'workspace';

interface WorkspaceShape {
  readonly workspace?: Workspace;
}

let store: ElectronStore<WorkspaceShape> | null = null;
let workspace: null | Workspace = null;

export const workspaceStoreService = {
  addMod(path: string): Workspace {
    const current = ensureLoaded();
    if (current.includedMods.some((mod) => mod.path === path)) {
      return current;
    }
    const mod: IncludedMod = {
      id: randomUUID(),
      name: basename(path),
      path,
      permission: 'editable',
    };
    return persist({ includedMods: [...current.includedMods, mod] });
  },
  get(): Workspace {
    return ensureLoaded();
  },
  async load(): Promise<Workspace> {
    const parsed = parseWorkspace(getStore().get(WORKSPACE_KEY));
    const includedMods = await pruneMissing(parsed.includedMods);
    return persist({ includedMods });
  },
  removeMod(id: ModId): Workspace {
    const current = ensureLoaded();
    const includedMods = current.includedMods.filter((mod) => mod.id !== id);
    return persist({ includedMods });
  },
};

function ensureLoaded(): Workspace {
  if (workspace === null) {
    workspace = parseWorkspace(getStore().get(WORKSPACE_KEY));
  }
  return workspace;
}

function getStore(): ElectronStore<WorkspaceShape> {
  if (store === null) {
    store = new ElectronStore<WorkspaceShape>({
      migrations: {},
      name: resolveStoreName(),
    });
  }
  return store;
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.stat(target);
    return true;
  } catch {
    return false;
  }
}

function persist(next: Workspace): Workspace {
  workspace = next;
  getStore().set(WORKSPACE_KEY, next);
  return next;
}

async function pruneMissing(
  mods: readonly IncludedMod[],
): Promise<readonly IncludedMod[]> {
  const checks = await Promise.all(
    mods.map(async (mod) => ({ keep: await pathExists(mod.path), mod })),
  );
  return checks.filter((check) => check.keep).map((check) => check.mod);
}
