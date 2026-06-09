import { IPC_CHANNELS, Workspace } from '@contracts';
import { ipcMain } from 'electron';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  activeGameFolderPath,
  activeGameId,
  workspaceStoreService,
} from '../workspace';
import {
  extractIpcError,
  getCapturedHandler,
  makeInvokeEvent,
} from './__test-utils__/capture-ipc-handler';
import { registerWorkspaceHandlers } from './workspace-handlers.setup';

vi.mock('../workspace', async (importActual) => {
  const actual = await importActual<typeof import('../workspace')>();
  return {
    ...actual,
    activeGameFolderPath: vi.fn(),
    activeGameId: vi.fn(),
    workspaceStoreService: {
      addMod: vi.fn(),
      get: vi.fn(),
      removeMod: vi.fn(),
    },
  };
});

const fakeWorkspace: Workspace = {
  includedMods: [
    { id: 'mod-1', name: 'alpha', path: '/mods/alpha', permission: 'editable' },
  ],
};

describe('registerWorkspaceHandlers', () => {
  beforeEach(() => {
    vi.mocked(ipcMain.handle).mockReset();
    vi.mocked(workspaceStoreService.addMod).mockReset();
    vi.mocked(workspaceStoreService.get).mockReset();
    vi.mocked(workspaceStoreService.removeMod).mockReset();
    vi.mocked(activeGameId).mockReset();
    vi.mocked(activeGameFolderPath).mockReset();
    vi.mocked(activeGameId).mockReturnValue('hoi4');
    vi.mocked(activeGameFolderPath).mockResolvedValue(null);
    registerWorkspaceHandlers();
  });

  describe('workspace:get', () => {
    it('returns mods only when no game folder path is set', async () => {
      vi.mocked(workspaceStoreService.get).mockReturnValue(fakeWorkspace);
      const handler = getCapturedHandler(IPC_CHANNELS.workspace.get);
      await expect(handler(makeInvokeEvent())).resolves.toEqual(fakeWorkspace);
    });

    it('leads includedMods with a synthetic readonly vanilla entry when a game folder path is set', async () => {
      vi.mocked(workspaceStoreService.get).mockReturnValue(fakeWorkspace);
      vi.mocked(activeGameFolderPath).mockResolvedValue('/games/hoi4');
      const handler = getCapturedHandler(IPC_CHANNELS.workspace.get);
      await expect(handler(makeInvokeEvent())).resolves.toEqual({
        includedMods: [
          {
            id: 'vanilla:hoi4',
            name: 'hoi4',
            path: '/games/hoi4',
            permission: 'readonly',
          },
          {
            id: 'mod-1',
            name: 'alpha',
            path: '/mods/alpha',
            permission: 'editable',
          },
        ],
      });
    });
  });

  describe('workspace:addMod', () => {
    it('adds the mod at the given path and returns the new workspace', async () => {
      vi.mocked(workspaceStoreService.addMod).mockReturnValue(fakeWorkspace);
      const handler = getCapturedHandler(IPC_CHANNELS.workspace.addMod);
      await expect(handler(makeInvokeEvent(), '/mods/alpha')).resolves.toEqual(
        fakeWorkspace,
      );
      expect(workspaceStoreService.addMod).toHaveBeenCalledWith('/mods/alpha');
    });

    it('rejects with code 400 when the path is not a string', async () => {
      const handler = getCapturedHandler(IPC_CHANNELS.workspace.addMod);
      await expect(handler(makeInvokeEvent(), 42)).rejects.toSatisfy(
        (error) => extractIpcError(error).code === 400,
      );
      expect(workspaceStoreService.addMod).not.toHaveBeenCalled();
    });
  });

  describe('workspace:removeMod', () => {
    it('removes the mod with the given id and returns the new workspace', async () => {
      const empty: Workspace = { includedMods: [] };
      vi.mocked(workspaceStoreService.removeMod).mockReturnValue(empty);
      const handler = getCapturedHandler(IPC_CHANNELS.workspace.removeMod);
      await expect(handler(makeInvokeEvent(), 'mod-1')).resolves.toEqual(empty);
      expect(workspaceStoreService.removeMod).toHaveBeenCalledWith('mod-1');
    });

    it('rejects with code 400 when the id is not a string', async () => {
      const handler = getCapturedHandler(IPC_CHANNELS.workspace.removeMod);
      await expect(handler(makeInvokeEvent(), null)).rejects.toSatisfy(
        (error) => extractIpcError(error).code === 400,
      );
      expect(workspaceStoreService.removeMod).not.toHaveBeenCalled();
    });
  });
});
