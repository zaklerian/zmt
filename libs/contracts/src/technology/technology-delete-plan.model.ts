import type { ModId } from '../workspace';

// `technology:deletePlan(id)` — what a delete would remove, computed on the MAIN
// side from the entity index's edge graph (ZMT-52). The renderer holds one
// folder's slim rows and could not answer either half: the descendant closure
// needs the whole folder's edges, and the inbound-reference scan needs every
// technology in the workspace, including the folders the canvas never loaded.
//
// The channel returns BOTH modes in one call because the confirmation must state
// the tree count before the user picks a mode; asking twice would show a count
// the user cannot see until after choosing.

// One mode's plan: what is removed, what is refused, and what will dangle.
export interface TechnologyDeletePlan {
  // Tokens in the set whose winning source is NOT editable (vanilla-owned). A
  // write targets the editable owner, never a readonly source (ADR 027 decision
  // 5), so a non-empty list refuses the whole delete rather than removing part of
  // a set and leaving the rest — the create-override route is deferred.
  readonly blocked: readonly string[];
  // Technologies OUTSIDE the set that reference something inside it. Baseline
  // behaviour is WARN, NOT CASCADE (Q93 = A1): the delete proceeds and leaves
  // these references dangling; rewriting them is the L-011 worker cascade.
  readonly inboundReferences: readonly TechnologyInboundReference[];
  // The removed technologies with the editable file each is written from, the
  // selected one first, then its descendants in traversal order. `targets.length`
  // IS the count the confirmation shows.
  readonly targets: readonly TechnologyDeleteTarget[];
}

// The two modes a delete offers, planned together.
export interface TechnologyDeletePlanResult {
  // The selected technology alone.
  readonly item: TechnologyDeletePlan;
  // The selected technology plus its downward closure. Equal to `item` for a leaf
  // — which is exactly the signal the confirmation reads to offer one option
  // instead of two.
  readonly tree: TechnologyDeletePlan;
}

// One removed technology addressed the way every write in this app is addressed:
// the owning mod plus a mod-relative path, never an absolute path.
export interface TechnologyDeleteTarget {
  readonly modId: ModId;
  readonly relativePath: string;
  readonly token: string;
}

// One technology outside the deleted set that names something inside it, with the
// deleted tokens it names. Both reference forms count: a `path.leads_to_tech` and
// a `dependencies` entry each dangle identically once the target is gone.
export interface TechnologyInboundReference {
  readonly referencedTokens: readonly string[];
  readonly token: string;
}
