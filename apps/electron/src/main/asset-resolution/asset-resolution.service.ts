import type { AssetResolution } from './asset-resolution.model';

import { resolveIndexSources } from '../entity-index/resolve-index-sources.util';
import { activeGameFolderPath, workspaceStoreService } from '../workspace';
import { resolveAssetFile } from './resolve-asset-file.util';

// Resolution B as a standalone service (ZMT-39): given a relative texture path (a
// sprite's raw `texturefile`), resolve it to the actual file on disk with
// provenance. Projects the workspace into the same ordered source list the entity
// index resolves across (vanilla-first readonly, then mods) so the vanilla
// fallback — a texture referenced but absent from every mod, present only in the
// readonly vanilla reference — falls out of the shared last-wins primitive rather
// than a special case. Stateless and uncached: an asset resolve is a directory
// probe plus an in-memory `resolveLoadOrder`, cheap beside the parse the sprite
// index already caches.
async function resolve(rawTexturePath: string): Promise<AssetResolution> {
  const sources = resolveIndexSources(
    workspaceStoreService.get(),
    await activeGameFolderPath(),
  );
  return resolveAssetFile(sources, rawTexturePath);
}

export const assetResolutionService = {
  resolve,
} as const;
