import { IPC_CHANNELS, IPC_ERROR_CODES, IpcError, Workspace } from '@contracts';

import { ipcHandle } from '../ipc';
import { workspaceStoreService } from '../workspace';

export function registerWorkspaceHandlers(): void {
  ipcHandle<Workspace>(IPC_CHANNELS.workspace.get, async () =>
    workspaceStoreService.get(),
  );

  ipcHandle<Workspace>(
    IPC_CHANNELS.workspace.openMod,
    async (_event, rawPath) => {
      const path = requireString(rawPath, 'path');
      return workspaceStoreService.openMod(path);
    },
  );

  ipcHandle<Workspace>(
    IPC_CHANNELS.workspace.closeMod,
    async (_event, rawId) => {
      const id = requireString(rawId, 'id');
      return workspaceStoreService.closeMod(id);
    },
  );
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw {
      code: IPC_ERROR_CODES.BAD_REQUEST,
      message: `${field} must be a string`,
    } satisfies IpcError;
  }
  return value;
}
