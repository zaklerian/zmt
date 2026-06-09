import type { Workspace } from '@contracts';

import { beforeEach, describe, expect, it, vi } from 'vitest';

let storeData: Record<string, unknown>;
let existingPaths: Set<string>;

vi.mock('electron-store', () => ({
  default: class {
    delete(key: string): void {
      delete storeData[key];
    }
    get(key: string): unknown {
      return storeData[key];
    }
    set(key: string, value: unknown): void {
      storeData[key] = value;
    }
  },
}));

vi.mock('node:fs', () => ({
  promises: {
    stat: vi.fn(async (target: string) => {
      if (existingPaths.has(target)) return {};
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    }),
  },
}));

async function loadService() {
  vi.resetModules();
  const module = await import('./workspace-store.service');
  return module.workspaceStoreService;
}

describe('workspaceStoreService', () => {
  beforeEach(() => {
    storeData = {};
    existingPaths = new Set();
  });

  describe('openMod', () => {
    it('appends a new mod, names it by basename, and sets it active', async () => {
      const service = await loadService();
      const result = service.openMod('/mods/alpha');

      expect(result.openMods).toHaveLength(1);
      expect(result.openMods[0].name).toBe('alpha');
      expect(result.openMods[0].path).toBe('/mods/alpha');
      expect(result.openMods[0].permission).toBe('editable');
      expect(result.activeModId).toBe(result.openMods[0].id);
    });

    it('dedupes by path and re-activates the existing mod', async () => {
      const service = await loadService();
      const first = service.openMod('/mods/alpha');
      service.openMod('/mods/beta');
      const again = service.openMod('/mods/alpha');

      expect(again.openMods).toHaveLength(2);
      expect(again.activeModId).toBe(first.openMods[0].id);
    });

    it('persists the workspace through to the store', async () => {
      const service = await loadService();
      service.openMod('/mods/alpha');

      expect((storeData.workspace as Workspace).openMods).toHaveLength(1);
    });
  });

  describe('closeMod', () => {
    it('removes the mod and clears activeModId when it was active', async () => {
      const service = await loadService();
      const opened = service.openMod('/mods/alpha');
      const result = service.closeMod(opened.openMods[0].id);

      expect(result.openMods).toHaveLength(0);
      expect(result.activeModId).toBeNull();
    });

    it('leaves activeModId intact when a non-active mod is closed', async () => {
      const service = await loadService();
      service.openMod('/mods/alpha');
      const second = service.openMod('/mods/beta');
      const firstId = second.openMods[0].id;
      const result = service.closeMod(firstId);

      expect(result.openMods).toHaveLength(1);
      expect(result.activeModId).toBe(second.activeModId);
    });
  });

  describe('getActiveModPath', () => {
    it('resolves the active mod id to its path', async () => {
      const service = await loadService();
      service.openMod('/mods/alpha');

      expect(service.getActiveModPath()).toBe('/mods/alpha');
    });

    it('returns null when no mod is active', async () => {
      const service = await loadService();

      expect(service.getActiveModPath()).toBeNull();
    });
  });

  describe('load', () => {
    it('prunes mods whose path no longer exists and nulls a dangling active id', async () => {
      // On-disk shape carries no permission; reconstruction coerces it.
      storeData.workspace = {
        activeModId: 'gone',
        openMods: [
          { id: 'gone', name: 'gone', path: '/mods/gone' },
          { id: 'here', name: 'here', path: '/mods/here' },
        ],
      };
      existingPaths = new Set(['/mods/here']);

      const service = await loadService();
      const result = await service.load();

      expect(result.openMods).toHaveLength(1);
      expect(result.openMods[0].id).toBe('here');
      expect(result.openMods[0].permission).toBe('editable');
      expect(result.activeModId).toBeNull();
    });

    it('keeps a still-present active mod through a prune', async () => {
      storeData.workspace = {
        activeModId: 'here',
        openMods: [{ id: 'here', name: 'here', path: '/mods/here' }],
      };
      existingPaths = new Set(['/mods/here']);

      const service = await loadService();
      const result = await service.load();

      expect(result.activeModId).toBe('here');
    });

    it('returns the default workspace when the stored value is absent', async () => {
      const service = await loadService();
      const result = await service.load();

      expect(result).toEqual({ activeModId: null, openMods: [] });
    });

    it('returns the default workspace when the stored value is corrupt', async () => {
      storeData.workspace = 42;

      const service = await loadService();
      const result = await service.load();

      expect(result).toEqual({ activeModId: null, openMods: [] });
    });
  });
});
