import type {
  TechnologySlim,
  TechTreeFolderGeometry,
  TechTreeGridbox,
} from '@contracts';

const TREE_SUFFIX = '_tree';

// Resolves which gridbox each positioned technology in a folder binds to
// (ADR 026 decision 3, closing the node→gridbox half of ledger L-022). The rule,
// grounded against BICE (see docs/grounding/ZMT-43-node-gridbox-binding.md):
//
//   1. A folder gridbox is named `{seedTechId}_tree`, where `seedTechId` is a
//      hidden root technology declared in the folder.
//   2. The `path`-edge graph partitions the folder into connected components, one
//      per seed.
//   3. Every technology binds to the gridbox of the seed in its component; its
//      cell is measured from THAT gridbox's local origin.
//
// A technology's own `folder` block names no gridbox and its cells interleave
// across the visual bands, so neither a name reference nor a cell-range partition
// selects the gridbox — the component-to-seed walk is the only rule that places
// every tech correctly. Rows must already be scoped to one folder; edges to techs
// outside `rows` are ignored so a stray cross-folder path cannot leak a component.
export function bindNodesToGridboxes(
  rows: readonly TechnologySlim[],
  geometry: TechTreeFolderGeometry,
): ReadonlyMap<string, TechTreeGridbox> {
  const present = new Set(rows.map((row) => row.id));
  const adjacency = pathAdjacency(rows, present);

  const binding = new Map<string, TechTreeGridbox>();
  for (const gridbox of geometry.gridboxes) {
    const seedId = seedIdOf(gridbox);
    if (seedId === null || !present.has(seedId)) {
      continue;
    }
    for (const member of reachableFrom(seedId, adjacency)) {
      binding.set(member, gridbox);
    }
  }
  return binding;
}

// Undirected `leads_to_tech` adjacency, restricted to techs present in `rows`
// (both endpoints), so a component stays inside the folder it was scoped to.
function pathAdjacency(
  rows: readonly TechnologySlim[],
  present: ReadonlySet<string>,
): ReadonlyMap<string, readonly string[]> {
  const adjacency = new Map<string, string[]>();
  const link = (a: string, b: string) => {
    const list = adjacency.get(a) ?? [];
    list.push(b);
    adjacency.set(a, list);
  };
  for (const row of rows) {
    for (const target of row.pathTargets) {
      if (!present.has(target)) {
        continue;
      }
      link(row.id, target);
      link(target, row.id);
    }
  }
  return adjacency;
}

function reachableFrom(
  start: string,
  adjacency: ReadonlyMap<string, readonly string[]>,
): ReadonlySet<string> {
  const seen = new Set<string>();
  const stack = [start];
  while (stack.length > 0) {
    const node = stack.pop() as string;
    if (seen.has(node)) {
      continue;
    }
    seen.add(node);
    for (const next of adjacency.get(node) ?? []) {
      if (!seen.has(next)) {
        stack.push(next);
      }
    }
  }
  return seen;
}

// A gridbox's seed technology id: its `name` with the `_tree` suffix removed, or
// null when the gridbox is unnamed or not suffixed that way (nothing binds to it).
function seedIdOf(gridbox: TechTreeGridbox): null | string {
  const { name } = gridbox;
  if (name === null || !name.endsWith(TREE_SUFFIX)) {
    return null;
  }
  return name.slice(0, -TREE_SUFFIX.length);
}
