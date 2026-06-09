import { GameId, ProjectedSource, Workspace } from '@contracts';

export function resolveProjectedSources(
  gameId: GameId | null,
  workspace: Workspace,
  gameFolderPath: null | string,
): readonly ProjectedSource[] {
  const mods: readonly ProjectedSource[] = workspace.openMods.map((mod) => ({
    path: mod.path,
    permission: mod.permission,
  }));

  if (typeof gameFolderPath === 'string' && gameFolderPath.length > 0) {
    return [{ path: gameFolderPath, permission: 'readonly' }, ...mods];
  }

  return mods;
}
