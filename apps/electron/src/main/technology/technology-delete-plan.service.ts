import type {
  IpcError,
  SourcesTable,
  TechnologyDeletePlan,
  TechnologyDeletePlanResult,
  TechnologyDeleteTarget,
  TechnologySlim,
} from '@contracts';
import type { EntityProvenance } from '@contracts';

import { IPC_ERROR_CODES } from '@contracts';
import {
  collectTechnologyDescendants,
  collectTechnologyInboundReferences,
  ENTITY_REGISTRY,
  projectTechnologySlim,
} from '@e-game-hoi4';

import { entityIndexService } from '../entity-index';

interface IndexedSlim {
  readonly provenance: EntityProvenance;
  readonly slim: TechnologySlim;
}

// `technology:deletePlan` — what deleting one technology would remove, for both
// modes (ZMT-52). It reads the SAME cached technology index `index:list` serves,
// so a plan taken right after the canvas loaded costs no re-resolve (ADR 024
// decision 5), and it computes both halves the renderer cannot:
//
//   - the DESCENDANT CLOSURE, which needs the folder's whole edge graph;
//   - the INBOUND REFERENCES, which need every technology in the workspace, not
//     the one folder the canvas holds.
//
// It only PLANS. The delete itself is composed renderer-side into an ADR 027
// batch and committed through `entity:writeBatch`, so the technology `.txt`
// deletions and the localisation `.yml` deletions stay in one atomic unit (ADR
// 028 decision 1). Loc keys are deliberately absent from the plan: their
// derivation is the renderer library's (`technologyLocKeys`, ZMT-50 grounding)
// and their owning files come from the existing `localisation:lookup` read, so
// putting them here would fork the one derivation into two homes.
export async function buildTechnologyDeletePlan(
  id: string,
): Promise<TechnologyDeletePlanResult> {
  const { entities, sources } = await entityIndexService.read(
    ENTITY_REGISTRY.technology,
  );
  const indexed: readonly IndexedSlim[] = entities.map((entity) => ({
    provenance: entity.provenance,
    slim: projectTechnologySlim(entity.entity),
  }));
  const slims = indexed.map((entry) => entry.slim);
  if (!slims.some((slim) => slim.id === id)) {
    throw {
      code: IPC_ERROR_CODES.NOT_FOUND,
      message: `No technology entity with id "${id}"`,
    } satisfies IpcError;
  }

  return {
    item: planFor([id], indexed, sources),
    tree: planFor(collectTechnologyDescendants(slims, id), indexed, sources),
  };
}

// The plan for one removal set: its write targets in traversal order, the tokens
// no editable source owns, and the outside technologies left pointing into it.
function planFor(
  tokens: readonly string[],
  indexed: readonly IndexedSlim[],
  sources: SourcesTable,
): TechnologyDeletePlan {
  const blocked: string[] = [];
  const targets: TechnologyDeleteTarget[] = [];
  for (const token of tokens) {
    const entry = indexed.find((candidate) => candidate.slim.id === token);
    if (entry === undefined) continue;
    const target = targetOf(token, entry.provenance, sources);
    if (target === null) blocked.push(token);
    else targets.push(target);
  }
  return {
    blocked,
    inboundReferences: collectTechnologyInboundReferences(
      indexed.map((entry) => entry.slim),
      new Set(tokens),
    ),
    targets,
  };
}

// The editable owner of one technology: the mod behind its winning source plus
// the file that definition was read from. Null for a vanilla-owned technology —
// a write never targets a readonly source (ADR 027 decision 5), and the
// create-override route that would answer it is deferred.
function targetOf(
  token: string,
  provenance: EntityProvenance,
  sources: SourcesTable,
): null | TechnologyDeleteTarget {
  const source = sources[provenance.sourceId];
  if (source === undefined || source.permission !== 'editable') return null;
  const { modId } = source;
  if (modId === null) return null;
  return { modId, relativePath: provenance.relativePath, token };
}
