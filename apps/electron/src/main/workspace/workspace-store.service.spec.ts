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

  describe('addMod', () => {
    it('appends a new mod and names it by basename', async () => {
      const service = await loadService();
      const result = service.addMod('/mods/alpha');

      expect(result.includedMods).toHaveLength(1);
      expect(result.includedMods[0].name).toBe('alpha');
      expect(result.includedMods[0].path).toBe('/mods/alpha');
      expect(result.includedMods[0].permission).toBe('editable');
    });

    it('appends a second mod without replacing the first', async () => {
      const service = await loadService();
      service.addMod('/mods/alpha');
      const result = service.addMod('/mods/beta');

      expect(result.includedMods.map((mod) => mod.path)).toEqual([
        '/mods/alpha',
        '/mods/beta',
      ]);
    });

    it('dedupes by path as a no-op, leaving the collection unchanged', async () => {
      const service = await loadService();
      service.addMod('/mods/alpha');
      const before = service.addMod('/mods/beta');
      const again = service.addMod('/mods/alpha');

      expect(again.includedMods.map((mod) => mod.path)).toEqual(
        before.includedMods.map((mod) => mod.path),
      );
    });

    it('persists the workspace through to the store', async () => {
      const service = await loadService();
      service.addMod('/mods/alpha');

      expect((storeData.workspace as Workspace).includedMods).toHaveLength(1);
    });
  });

  describe('removeMod', () => {
    it('removes the mod with the given id', async () => {
      const service = await loadService();
      const opened = service.addMod('/mods/alpha');
      const result = service.removeMod(opened.includedMods[0].id);

      expect(result.includedMods).toHaveLength(0);
    });

    it('removes only the targeted mod, leaving the rest', async () => {
      const service = await loadService();
      const alpha = service.addMod('/mods/alpha');
      service.addMod('/mods/beta');
      const result = service.removeMod(alpha.includedMods[0].id);

      expect(result.includedMods.map((mod) => mod.path)).toEqual([
        '/mods/beta',
      ]);
    });
  });

  describe('load', () => {
    it('prunes mods whose path no longer exists', async () => {
      // On-disk shape carries no permission; reconstruction coerces it.
      storeData.workspace = {
        includedMods: [
          { id: 'gone', name: 'gone', path: '/mods/gone' },
          { id: 'here', name: 'here', path: '/mods/here' },
        ],
      };
      existingPaths = new Set(['/mods/here']);

      const service = await loadService();
      const result = await service.load();

      expect(result.includedMods).toHaveLength(1);
      expect(result.includedMods[0].id).toBe('here');
      expect(result.includedMods[0].permission).toBe('editable');
    });

    it('keeps still-present mods through a prune', async () => {
      storeData.workspace = {
        includedMods: [{ id: 'here', name: 'here', path: '/mods/here' }],
      };
      existingPaths = new Set(['/mods/here']);

      const service = await loadService();
      const result = await service.load();

      expect(result.includedMods.map((mod) => mod.id)).toEqual(['here']);
    });

    it('returns the default workspace when the stored value is absent', async () => {
      const service = await loadService();
      const result = await service.load();

      expect(result).toEqual({ includedMods: [] });
    });

    it('returns the default workspace when the stored value is corrupt', async () => {
      storeData.workspace = 42;

      const service = await loadService();
      const result = await service.load();

      expect(result).toEqual({ includedMods: [] });
    });
  });
});
