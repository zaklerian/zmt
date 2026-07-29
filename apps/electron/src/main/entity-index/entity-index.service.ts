import type { CatalogModule } from '@contracts';

import { dialectsFromPlugins } from '@paradox-parser';
import { promises as fs } from 'node:fs';

import type {
  EntityIndexResult,
  EntityRegistryEntry,
} from './entity-index.model';

import { pluginRegistryService } from '../plugins';
import { activeGameFolderPath, workspaceStoreService } from '../workspace';
import {
  resolveContributingFiles,
  resolveEntities,
} from './build-entity-index.util';
import { ENTITY_REGISTRY, type EntityTypeId } from './entity-registry.const';
import { resolveIndexSources } from './resolve-index-sources.util';

interface CacheEntry {
  readonly result: EntityIndexResult<unknown>;
  // Absolute path → mtimeMs of every contributing file at build time. A read
  // rebuilds when the current stage-1 file set or any mtime differs (ADR 024
  // decision 5).
  readonly validity: ReadonlyMap<string, number>;
}

// Per-entity-type cache, keyed by entity id. Whole-entity-type rebuild on
// invalidation (ADR 024 decision 5). UPGRADE PATH: per-file-granular rebuild
// (re-parse only the touched file, re-resolve only the entities it provides) —
// taken ONLY if a whole-type rebuild is measured slow, not pre-emptively.
const cache = new Map<string, CacheEntry>();

// Clears every entity type's cache. The coarse reset for a source-set change
// (mods added/removed) and the reset used between tests. A source-set change is
// also caught structurally — a different source set yields different contributing
// file paths, so the validity check already misses — but clearing is the explicit
// hook.
function clear(): void {
  cache.clear();
}

// Invalidates one entity type's cache explicitly. The same-tick guard (ADR 024
// decision 5): a read can follow our own write within one mtime tick on
// coarse-granularity filesystems, so correctness must not depend on mtime
// granularity — the write path calls this rather than relying on the stat check.
function invalidate(entityId: EntityTypeId): void {
  cache.delete(entityId);
}

// Invalidates the entity type whose folder owns the written file, if any. Called
// by the write path after a successful write/delete so our own edit never serves
// a stale index within one mtime tick.
function invalidateForRelativePath(relativePath: string): void {
  for (const entityId of Object.keys(ENTITY_REGISTRY) as EntityTypeId[]) {
    if (isUnderFolder(relativePath, ENTITY_REGISTRY[entityId].folder)) {
      cache.delete(entityId);
    }
  }
}

function isUnderFolder(relativePath: string, folder: string): boolean {
  return relativePath.replaceAll('\\', '/').startsWith(`${folder}/`);
}

// Adapts the module index to the legacy `CatalogModule` shape the slot picker
// consumes (ADR 024 decision 6 — the index subsumes `catalog-modules`). `source`
// is joined from the normalized `sources` table by the entity's winning id.
async function moduleCatalog(): Promise<readonly CatalogModule[]> {
  const { entities, sources } = await read(ENTITY_REGISTRY.module);
  return entities.map((indexed) => ({
    category: indexed.entity.category,
    name: indexed.entity.name,
    source: sources[indexed.provenance.sourceId].path,
  }));
}

// Two-stage source-scoped read for one entity type, cached (ADR 024). Stage 1
// runs every call (cheap, and it detects file-set changes the mtime map cannot);
// the parse-heavy stage 2 is served from cache while the contributing files'
// mtimes are unchanged. Takes the registry entry directly so the result stays
// typed to the caller's entity — the only assertion is the heterogeneous cache's
// stored result, keyed by entity id whose entry fixes T (R-TS-2).
async function read<T>(
  entry: EntityRegistryEntry<T>,
): Promise<EntityIndexResult<T>> {
  const dialects = dialectsFromPlugins(pluginRegistryService.list());
  const sources = resolveIndexSources(
    workspaceStoreService.get(),
    await activeGameFolderPath(),
  );

  const files = await resolveContributingFiles(sources, entry.folder, dialects);
  const validity = await statValidity(files);

  const cached = cache.get(entry.entityId);
  if (cached !== undefined && sameValidity(cached.validity, validity)) {
    return cached.result as EntityIndexResult<T>;
  }

  const result = await resolveEntities(files, sources, entry, dialects);
  cache.set(entry.entityId, { result, validity });
  return result;
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
  files: readonly { readonly absolutePath: string }[],
): Promise<ReadonlyMap<string, number>> {
  const validity = new Map<string, number>();
  await Promise.all(
    files.map(async (file) => {
      try {
        const stat = await fs.stat(file.absolutePath);
        validity.set(file.absolutePath, stat.mtimeMs);
      } catch {
        // A file that vanished between enumerate and stat forces a rebuild: -1
        // never matches a real mtime, so the next read cannot serve stale data.
        validity.set(file.absolutePath, -1);
      }
    }),
  );
  return validity;
}

export const entityIndexService = {
  clear,
  invalidate,
  invalidateForRelativePath,
  moduleCatalog,
  read,
} as const;
