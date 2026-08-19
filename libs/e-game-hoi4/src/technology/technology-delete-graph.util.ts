import type { TechnologyInboundReference, TechnologySlim } from '@contracts';

// The delete-tree edge graph (ZMT-52), pure over the slim projection the entity
// index already produces. It lives here for the same reason the extractors and
// the geometry projection do: it is game-shape logic the main process consumes,
// and keeping it out of `apps/electron` keeps the readonly-parameter boundary
// (P-1) free of it.
//
// THE TWO REF KINDS POINT OPPOSITE WAYS, SO THEY PLAY DIFFERENT ROLES (Q94 = A1).
// A technology's block names both, but they are not one relation:
//
//   - `path.leads_to_tech` names a SUCCESSOR — the tech this one unlocks. It is
//     the DRAWN chain, and it is the ONLY edge the descendant closure follows.
//   - `dependencies` names an AND-PREREQUISITE — a tech this one needs, i.e. an
//     UPSTREAM edge (see `TechnologyEntity`'s own model comment).
//
// Following both forward would walk downstream along `path` and upstream along
// `dependencies`, so "delete tree" could remove the prerequisites the target
// depends on — never what delete-tree should mean. The ticket's original rule
// said both; it was wrong, and this is the corrected one.
//
// `dependencies` keeps the two roles it is actually right for: the INBOUND scan
// below (deleting a tech others depend on is exactly what dangles, so it must be
// warned) and the canvas's dashed overlay (ZMT-44). Across the feature the split
// is therefore consistent — `path` = the successor chain delete-tree follows;
// `dependencies` = the AND-prereqs that surface as warnings and overlay, never as
// descendants.

// The tokens a delete-tree removes: the root plus its SUCCESSOR closure over
// `path.leads_to_tech` alone, in breadth-first order with the root first. A
// `dependencies` prerequisite of a removed technology is NOT removed — it sits
// upstream, and taking it would delete something the target needed rather than
// something that needed the target (header). Traversal is further confined to the
// ROOT'S FOLDER — a ref leaving the folder (another country's tree) is a
// boundary, not a descendant — and to tokens the index actually resolves, so a
// ref to a token no source defines contributes nothing.
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
    for (const ref of current.pathTargets) {
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
// deleted tokens it names. BOTH ref kinds count here (unlike the closure above):
// a `dependencies` entry pointing at a removed technology is precisely the
// dangling AND-prerequisite this warning exists for. Workspace-wide by design: a
// technology in any folder can name one in another, and the renderer holds one
// folder's rows — which is why this is computed here and not there.
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
      ...new Set(declaredRefs(slim).filter((ref) => deleted.has(ref))),
    ];
    if (referencedTokens.length === 0) continue;
    references.push({ referencedTokens, token: slim.id });
  }
  return references.sort((a, b) => a.token.localeCompare(b.token));
}

// Every token one technology's block names as a tech-tree edge, in EITHER
// direction. Only the inbound scan uses this: a reference dangles when its target
// disappears regardless of which way the edge points, so both kinds count there.
// The descendant closure deliberately does NOT use it — see the header.
function declaredRefs(slim: TechnologySlim): readonly string[] {
  return [...slim.pathTargets, ...slim.dependencyTargets];
}
