import type { Workspace } from '@contracts';

import type { IndexSource } from './entity-index.model';

// Projects the workspace into the ordered source list the index resolves across,
// lowest → highest precedence (ADR 016). Mirrors `resolveProjectedSources`
// (workspace) but KEEPS each mod's id: the index's `sources` table carries
// `modId` (ADR 024 decision 3), which the plain `ProjectedSource` shape drops.
// The vanilla game folder is a readonly source with no mod identity (`modId`
// null), prepended so mods override it.
export function resolveIndexSources(
  workspace: Workspace,
  gameFolderPath: null | string,
): readonly IndexSource[] {
  const mods: readonly IndexSource[] = workspace.includedMods.map((mod) => ({
    modId: mod.id,
    path: mod.path,
    permission: mod.permission,
  }));

  if (typeof gameFolderPath === 'string' && gameFolderPath.length > 0) {
    return [
      { modId: null, path: gameFolderPath, permission: 'readonly' },
      ...mods,
    ];
  }

  return mods;
}
