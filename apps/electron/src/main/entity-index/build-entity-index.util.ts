import type {
  EntityProvenance,
  IndexedEntity,
  IndexSourceInfo,
} from '@contracts';
import type { EntityRegistryEntry } from '@e-game-hoi4';

import { parse } from '@paradox-parser';
import { promises as fs } from 'node:fs';

import type { ResolvedFile } from '../resolution';
import type { EntityIndexResult, IndexSource } from './entity-index.model';

import { resolveLoadOrder } from '../resolution';
import { enumerateEntitySources } from './enumerate-entity-sources.util';

interface EntityAccumulator<T> {
  readonly entity: T;
  readonly id: string;
  readonly shadowedSourceIds: readonly string[];
  readonly sourceId: string;
}

// Convenience: run both stages. Used by callers that do not need the stage-1
// file list separately (the service splits the stages so stage 1's file mtimes
// drive cache validation).
export async function buildEntityIndex<T>(
  sources: readonly IndexSource[],
  entry: EntityRegistryEntry<T>,
  dialects: readonly string[],
): Promise<EntityIndexResult<T>> {
  const files = await resolveContributingFiles(sources, entry.folder, dialects);
  return resolveEntities(files, sources, entry, dialects);
}

// Stage 1 — file resolution (ADR 024 / ZMT-30 amendment). Enumerate the entity
// type's folder across sources and settle the load order, honouring
// `replace_path` (ADR 016). The result is the contributing files, one winner per
// relative path. `resolveLoadOrder` sorts by relative path; stage 2 re-orders
// these into the engine's load order (source precedence major, filename minor).
export async function resolveContributingFiles(
  sources: readonly IndexSource[],
  folder: string,
  dialects: readonly string[],
): Promise<readonly ResolvedFile[]> {
  return resolveLoadOrder(
    await enumerateEntitySources(sources, folder, dialects),
  );
}

// Stage 2 — entity resolution (ADR 024 / ZMT-30 amendment). Parse EVERY
// contributing file (not only a single winner: a same-name entity can live in a
// differently-named, lower-precedence file that file-level resolution would keep
// as its own path's winner), extract entities, and resolve same-name entities
// last-wins in load order. Load order is the engine's: source precedence MAJOR
// (a mod loads after vanilla, so its definition overrides regardless of
// filename), file name MINOR within a source. Each survivor records
// `{ sourceId, shadowedSourceIds, reason }`, an entity-level vocabulary distinct
// from `ResolvedFile.reason`. The companion `sources` table normalizes source
// detail, joined by source id.
export async function resolveEntities<T>(
  files: readonly ResolvedFile[],
  sources: readonly IndexSource[],
  entry: EntityRegistryEntry<T>,
  dialects: readonly string[],
): Promise<EntityIndexResult<T>> {
  const sourceByRoot = new Map(sources.map((source) => [source.path, source]));
  const precedenceByRoot = new Map(
    sources.map((source, order) => [source.path, order]),
  );
  const ordered = [...files].sort((a, b) => {
    const byPrecedence =
      (precedenceByRoot.get(a.winningSource.root) ?? 0) -
      (precedenceByRoot.get(b.winningSource.root) ?? 0);
    return byPrecedence !== 0
      ? byPrecedence
      : a.relativePath.localeCompare(b.relativePath);
  });

  const byName = new Map<string, EntityAccumulator<T>>();
  for (const file of ordered) {
    const script = parse(await fs.readFile(file.absolutePath, 'utf8'), {
      dialects,
    });
    const sourceId = file.winningSource.root;
    for (const entity of entry.extract(script)) {
      const id = entry.identify(entity);
      const prev = byName.get(id);
      const shadowedSourceIds =
        prev === undefined ? [] : [...prev.shadowedSourceIds, prev.sourceId];
      byName.set(id, { entity, id, shadowedSourceIds, sourceId });
    }
  }

  const entities: readonly IndexedEntity<T>[] = [...byName.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((accumulator) => ({
      entity: accumulator.entity,
      id: accumulator.id,
      provenance: provenanceOf(accumulator),
    }));

  return { entities, sources: sourcesTableOf(files, sourceByRoot) };
}

function provenanceOf<T>(accumulator: EntityAccumulator<T>): EntityProvenance {
  return {
    reason:
      accumulator.shadowedSourceIds.length > 0
        ? 'overriding-definition'
        : 'sole-definition',
    shadowedSourceIds: accumulator.shadowedSourceIds,
    sourceId: accumulator.sourceId,
  };
}

function sourcesTableOf(
  files: readonly ResolvedFile[],
  sourceByRoot: ReadonlyMap<string, IndexSource>,
): Readonly<Record<string, IndexSourceInfo>> {
  const table: Record<string, IndexSourceInfo> = {};
  for (const file of files) {
    const root = file.winningSource.root;
    const source = sourceByRoot.get(root);
    if (source === undefined || table[root] !== undefined) {
      continue;
    }
    table[root] = {
      modId: source.modId,
      path: source.path,
      permission: source.permission,
    };
  }
  return table;
}
