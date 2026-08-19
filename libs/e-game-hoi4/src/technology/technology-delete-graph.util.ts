import type { TechnologyInboundReference, TechnologySlim } from '@contracts';

// The delete-tree edge graph (ZMT-52), pure over the slim projection the entity
// index already produces. It lives here for the same reason the extractors and
// the geometry projection do: it is game-shape logic the main process consumes,
// and keeping it out of `apps/electron` keeps the readonly-parameter boundary
// (P-1) free of it.
//
// THE EDGE RELATION IS "A DECLARES B". A technology's outbound refs are every
// token its own block names as a tech-tree edge: each `path.leads_to_tech` and
// every `dependencies` entry. Descendants are the forward closure of that
// relation; inbound references are its inverse restricted to the deleted set.
// The two are complements of ONE relation, which is what makes the count shown
// and the warning shown describe the same graph.
//
// DIVERGENCE, RECORDED NOT RESOLVED (ZMT-52 PR): the two ref kinds do not point
// the same way in game terms. `path.leads_to_tech` names a SUCCESSOR (this tech
// unlocks that one), while `dependencies` names a PREREQUISITE (this tech needs
// that one) — see `TechnologyEntity`'s own model comment. So following both
// forward walks downstream along `path` and UPSTREAM along `dependencies`, and a
// delete-tree can therefore pull in a prerequisite rather than only descendants.
// The ticket specifies both as the outbound set; it is implemented as specified,
// the count is shown before the user confirms, and the direction question is
// raised in the PR rather than silently decided here.

// The tokens a delete-tree removes: the root plus its forward closure, in
// breadth-first order with the root first. Traversal is confined to the ROOT'S
// FOLDER — a ref leaving the folder (a doctrine prerequisite, another country's
// tree) is a boundary, not a descendant — and to tokens the index actually
// resolves, so a ref to a token no source defines contributes nothing.
export function collectTechnologyDescendants(
  slims: readonly TechnologySlim[],
  rootId: string,
): readonly string[] {
  const byId = new Map(slims.map((slim) => [slim.id, slim]));
  const root = byId.get(rootId);
  if (root === undefined) return [];

  const collected = [rootId];
  const seen = new Set(collected);
  const queue = [root];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) continue;
    for (const ref of outboundRefs(current)) {
      if (seen.has(ref)) continue;
      const next = byId.get(ref);
      if (next === undefined || next.folderName !== root.folderName) continue;
      seen.add(ref);
      collected.push(ref);
      queue.push(next);
    }
  }
  return collected;
}

// Every technology OUTSIDE `deleted` that names something inside it, with the
// deleted tokens it names. Workspace-wide by design: a technology in any folder
// can name one in another, and the renderer holds one folder's rows — which is
// why this is computed here and not there.
//
// It DETECTS ONLY (Q93 = A1). Nothing here rewrites a reference; the delete
// proceeds and the listed references dangle until the L-011 worker cascade lands.
export function collectTechnologyInboundReferences(
  slims: readonly TechnologySlim[],
  deleted: ReadonlySet<string>,
): readonly TechnologyInboundReference[] {
  const references: TechnologyInboundReference[] = [];
  for (const slim of slims) {
    if (deleted.has(slim.id)) continue;
    const referencedTokens = [
      ...new Set(outboundRefs(slim).filter((ref) => deleted.has(ref))),
    ];
    if (referencedTokens.length === 0) continue;
    references.push({ referencedTokens, token: slim.id });
  }
  return references.sort((a, b) => a.token.localeCompare(b.token));
}

// One technology's outbound refs: every token its own block names as an edge.
function outboundRefs(slim: TechnologySlim): readonly string[] {
  return [...slim.pathTargets, ...slim.dependencyTargets];
}
