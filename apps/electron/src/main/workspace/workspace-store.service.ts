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
    const activeModId = current.activeModId === id ? null : current.activeModId;
    return persist({ activeModId, openMods });
  },
  get(): Workspace {
    return ensureLoaded();
  },
  getActiveModPath(): null | string {
    const current = ensureLoaded();
    const active = current.openMods.find(
      (mod) => mod.id === current.activeModId,
    );
    return active ? active.path : null;
  },
  async load(): Promise<Workspace> {
    const parsed = parseWorkspace(getStore().get(WORKSPACE_KEY));
    const openMods = await pruneMissing(parsed.openMods);
    const activeModId = openMods.some((mod) => mod.id === parsed.activeModId)
      ? parsed.activeModId
      : null;
    return persist({ activeModId, openMods });
  },
  openMod(path: string): Workspace {
    const current = ensureLoaded();
    const existing = current.openMods.find((mod) => mod.path === path);
    if (existing) {
      return persist({ ...current, activeModId: existing.id });
    }
    const mod: OpenMod = { id: randomUUID(), name: basename(path), path };
    return persist({
      activeModId: mod.id,
      openMods: [...current.openMods, mod],
    });
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
