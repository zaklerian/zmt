import type { TechTreeGeometry, TechTreeGeometryProvenance } from '@contracts';

import { projectTechTreeGeometry } from '@e-game-hoi4';
import { dialectsFromPlugins, parse } from '@paradox-parser';
import { promises as fs } from 'node:fs';

import type { ResolvedFile } from '../resolution';
import type { GeometrySource } from './enumerate-tree-view-gui.util';

import { pluginRegistryService } from '../plugins';
import { resolveLoadOrder } from '../resolution';
import { activeGameFolderPath, workspaceStoreService } from '../workspace';
import {
  enumerateTreeViewGuiSources,
  projectGeometrySources,
} from './enumerate-tree-view-gui.util';
import { TREE_VIEW_GUI_PATHS } from './tech-tree-geometry.const';

interface CacheEntry {
  readonly result: TechTreeGeometry;
  // Absolute path → mtimeMs of every resolved `.gui` at build time. A read
  // rebuilds when the winning file set or any mtime differs — the same
  // validity-map discipline the entity index uses (ADR 024 decision 5), reduced
  // to the singleton `.gui`.
  readonly validity: ReadonlyMap<string, number>;
}

// The read is a config singleton (one geometry map), so the cache is a single
// optional entry rather than a per-key map.
let cache: CacheEntry | null = null;

// Clears the cached geometry. The reset used on a source-set change and between
// tests; a source-set change is also caught structurally (a different winning file
// yields a different validity map), but clearing is the explicit hook.
function clear(): void {
  cache = null;
}

function provenanceOf(
  resolved: ResolvedFile,
  sources: readonly GeometrySource[],
): TechTreeGeometryProvenance {
  const source = sources.find((s) => s.path === resolved.winningSource.root);
  return {
    absolutePath: resolved.absolutePath,
    modId: source?.modId ?? null,
    reason: resolved.reason,
    relativePath: resolved.relativePath,
  };
}

// The folder-keyed tech-tree geometry (ADR 025). Stage-1 load-order resolution
// (ADR 016) settles which source's tree-view `.gui` wins; the winning file is
// parsed and projected. Served from cache while the resolved file's mtime is
// unchanged. When no source declares the `.gui`, returns an empty map with null
// provenance rather than throwing — the canvas renders nothing for an absent view.
async function read(): Promise<TechTreeGeometry> {
  const dialects = dialectsFromPlugins(pluginRegistryService.list());
  const sources = projectGeometrySources(
    workspaceStoreService.get(),
    await activeGameFolderPath(),
  );

  const enumerated = await enumerateTreeViewGuiSources(
    sources,
    TREE_VIEW_GUI_PATHS,
    dialects,
  );
  const resolved = resolveLoadOrder(enumerated);
  const validity = await statValidity(resolved);

  if (cache !== null && sameValidity(cache.validity, validity)) {
    return cache.result;
  }

  const result = await resolveGeometry(resolved, sources, dialects);
  cache = { result, validity };
  return result;
}

// Picks the winning tree-view `.gui` from stage-1 resolution, parses it, and
// projects the folder-keyed geometry with provenance. A `.gui` that vanished
// between resolve and read is skipped, leaving an empty map — a read never throws
// on a missing view.
async function resolveGeometry(
  resolved: readonly ResolvedFile[],
  sources: readonly GeometrySource[],
  dialects: readonly string[],
): Promise<TechTreeGeometry> {
  const winner = resolved[0];
  if (winner === undefined) {
    return { folders: {}, provenance: null };
  }

  let text;
  try {
    text = await fs.readFile(winner.absolutePath, 'utf8');
  } catch {
    return { folders: {}, provenance: null };
  }

  return {
    folders: projectTechTreeGeometry(parse(text, { dialects })),
    provenance: provenanceOf(winner, sources),
  };
}

function sameValidity(
  a: ReadonlyMap<string, number>,
  b: ReadonlyMap<string, number>,
): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const [path, mtime] of a) {
    if (b.get(path) !== mtime) {
      return false;
    }
  }
  return true;
}

async function statValidity(
  resolved: readonly ResolvedFile[],
): Promise<ReadonlyMap<string, number>> {
  const validity = new Map<string, number>();
  await Promise.all(
    resolved.map(async (file) => {
      try {
        const stat = await fs.stat(file.absolutePath);
        validity.set(file.absolutePath, stat.mtimeMs);
      } catch {
        validity.set(file.absolutePath, -1);
      }
    }),
  );
  return validity;
}

export const techTreeGeometryService = {
  clear,
  read,
} as const;
