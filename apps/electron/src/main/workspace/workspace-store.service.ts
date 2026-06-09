import { ModId, OpenMod, Workspace } from '@contracts';
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
  closeMod(id: ModId): Workspace {
    const current = ensureLoaded();
    const openMods = current.openMods.filter((mod) => mod.id !== id);
    return persist({ openMods });
  },
  get(): Workspace {
    return ensureLoaded();
  },
  async load(): Promise<Workspace> {
    const parsed = parseWorkspace(getStore().get(WORKSPACE_KEY));
    const openMods = await pruneMissing(parsed.openMods);
    return persist({ openMods });
  },
  openMod(path: string): Workspace {
    const current = ensureLoaded();
    if (current.openMods.some((mod) => mod.path === path)) {
      return current;
    }
    const mod: OpenMod = {
      id: randomUUID(),
      name: basename(path),
      path,
      permission: 'editable',
    };
    return persist({ openMods: [...current.openMods, mod] });
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
  mods: readonly OpenMod[],
): Promise<readonly OpenMod[]> {
  const checks = await Promise.all(
    mods.map(async (mod) => ({ keep: await pathExists(mod.path), mod })),
  );
  return checks.filter((check) => check.keep).map((check) => check.mod);
}
