import { IPC_CHANNELS, Workspace } from '@contracts';
import { ipcMain } from 'electron';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { workspaceStoreService } from '../workspace';
import {
  extractIpcError,
  getCapturedHandler,
  makeInvokeEvent,
} from './__test-utils__/capture-ipc-handler';
import { registerWorkspaceHandlers } from './workspace-handlers.setup';

vi.mock('../workspace', () => ({
  workspaceStoreService: {
    closeMod: vi.fn(),
    get: vi.fn(),
    openMod: vi.fn(),
  },
}));

const fakeWorkspace: Workspace = {
  activeModId: 'mod-1',
  openMods: [{ id: 'mod-1', name: 'alpha', path: '/mods/alpha' }],
};

describe('registerWorkspaceHandlers', () => {
  beforeEach(() => {
    vi.mocked(ipcMain.handle).mockReset();
    vi.mocked(workspaceStoreService.closeMod).mockReset();
    vi.mocked(workspaceStoreService.get).mockReset();
    vi.mocked(workspaceStoreService.openMod).mockReset();
    registerWorkspaceHandlers();
  });

  describe('workspace:get', () => {
    it('returns the current workspace from the store', async () => {
      vi.mocked(workspaceStoreService.get).mockReturnValue(fakeWorkspace);
      const handler = getCapturedHandler(IPC_CHANNELS.workspace.get);
      await expect(handler(makeInvokeEvent())).resolves.toEqual(fakeWorkspace);
    });
  });

  describe('workspace:openMod', () => {
    it('opens the mod at the given path and returns the new workspace', async () => {
      vi.mocked(workspaceStoreService.openMod).mockReturnValue(fakeWorkspace);
      const handler = getCapturedHandler(IPC_CHANNELS.workspace.openMod);
      await expect(handler(makeInvokeEvent(), '/mods/alpha')).resolves.toEqual(
        fakeWorkspace,
      );
      expect(workspaceStoreService.openMod).toHaveBeenCalledWith('/mods/alpha');
    });

    it('rejects with code 400 when the path is not a string', async () => {
      const handler = getCapturedHandler(IPC_CHANNELS.workspace.openMod);
      await expect(handler(makeInvokeEvent(), 42)).rejects.toSatisfy(
        (error) => extractIpcError(error).code === 400,
      );
      expect(workspaceStoreService.openMod).not.toHaveBeenCalled();
    });
  });

  describe('workspace:closeMod', () => {
    it('closes the mod with the given id and returns the new workspace', async () => {
      const empty: Workspace = { activeModId: null, openMods: [] };
      vi.mocked(workspaceStoreService.closeMod).mockReturnValue(empty);
      const handler = getCapturedHandler(IPC_CHANNELS.workspace.closeMod);
      await expect(handler(makeInvokeEvent(), 'mod-1')).resolves.toEqual(empty);
      expect(workspaceStoreService.closeMod).toHaveBeenCalledWith('mod-1');
    });

    it('rejects with code 400 when the id is not a string', async () => {
      const handler = getCapturedHandler(IPC_CHANNELS.workspace.closeMod);
      await expect(handler(makeInvokeEvent(), null)).rejects.toSatisfy(
        (error) => extractIpcError(error).code === 400,
      );
      expect(workspaceStoreService.closeMod).not.toHaveBeenCalled();
    });
  });
});
