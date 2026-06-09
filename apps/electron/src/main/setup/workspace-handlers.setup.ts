import {
  GameId,
  IPC_CHANNELS,
  IPC_ERROR_CODES,
  IpcError,
  OpenMod,
  Workspace,
} from '@contracts';
import { basename } from 'node:path';

import { ipcHandle } from '../ipc';
import {
  activeGameFolderPath,
  activeGameId,
  resolveProjectedSources,
  workspaceStoreService,
} from '../workspace';

export function registerWorkspaceHandlers(): void {
  ipcHandle<Workspace>(IPC_CHANNELS.workspace.get, async () => {
    const workspace = workspaceStoreService.get();
    const gameId = activeGameId();
    const sources = resolveProjectedSources(
      gameId,
      workspace,
      await activeGameFolderPath(),
    );

    // resolveProjectedSources only ever prepends a single readonly vanilla
    // source; when none was added the projection equals the persisted shape.
    if (sources.length === workspace.openMods.length) {
      return workspace;
    }

    const vanilla = vanillaEntry(gameId, sources[0].path);
    return {
      openMods: [vanilla, ...workspace.openMods],
    };
  });

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

function vanillaEntry(gameId: GameId | null, path: string): OpenMod {
  return {
    id: `vanilla:${gameId ?? ''}`,
    name: basename(path),
    path,
    permission: 'readonly',
  };
}
