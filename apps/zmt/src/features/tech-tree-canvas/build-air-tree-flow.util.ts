import type { TechnologySlim, TechTreeFolderGeometry } from '@contracts';
import type { Edge, Node } from '@xyflow/react';

import { bindNodesToGridboxes } from './air-node-binding.util';
import { techNodePixel } from './tech-node-pixel.util';

export const TECH_NODE_TYPE = 'tech';

// The `dependencies` overlay (ADR 026 D3, Q12): the AND-prerequisites the game
// hides. Drawn dashed so it reads as distinct from the solid `path` connectors;
// carried on `data.kind` so a consumer (and its spec) can tell the two edge kinds
// apart without inspecting the visual style.
export const DEPENDENCY_EDGE_STYLE = {
  stroke: '#c77700',
  strokeDasharray: '6 4',
} as const;

export type TechFlowNode = Node<TechNodeData, typeof TECH_NODE_TYPE>;

export interface TechNodeData extends Record<string, unknown> {
  // The technology's own category tokens — what the ZMT-54 category filter matches
  // a selection against. Carried on the node because the built graph is the only
  // per-NODE carrier: the hook's `rows` cover one folder and miss the attached
  // subs, which render and must therefore dim with everything else.
  readonly categories: readonly string[];
  // Emphasis (ZMT-54), applied per render by the canvas and absent from the built
  // node: the tree is built once per fetch, the emphasis changes per keystroke.
  readonly dimmed?: boolean;
  readonly highlighted?: boolean;
  readonly nodeKind: TechnologySlim['nodeKind'];
  readonly token: string;
}

// A `sub` node sits adjacent to its parent — a react-flow child whose position is
// relative to the parent's top-left. Placed to the right and stacked so multiple
// subs on one parent do not overlap; never at absolute 0,0 (ADR 026 decision 3).
const SUB_OFFSET_X = 150;
const SUB_STACK_STEP_Y = 44;

// Builds the react-flow node/edge set for one folder from its slim rows and
// geometry (ADR 026). Positioned nodes land at their bound gridbox's
// `origin + cell × step` (the ZMT-43 binding); `path` targets draw as solid edges;
// `dependencies` targets draw as a separate dashed overlay (`dependencyEdges`, off
// by default — the canvas concatenates them only when toggled on); `sub`
// technologies attach as child nodes adjacent to their parent. Pure — the hook
// fetches and holds; this shapes.
export function buildAirTreeFlow(
  rows: readonly TechnologySlim[],
  geometry: TechTreeFolderGeometry,
): {
  readonly dependencyEdges: Edge[];
  readonly edges: Edge[];
  readonly nodes: TechFlowNode[];
} {
  const binding = bindNodesToGridboxes(rows, geometry);

  const nodes: TechFlowNode[] = [];
  const rendered = new Set<string>();
  for (const row of rows) {
    const gridbox = binding.get(row.id);
    if (row.position === null || gridbox === undefined) {
      continue;
    }
    nodes.push({
      data: {
        categories: row.categories,
        nodeKind: row.nodeKind,
        token: row.id,
      },
      id: row.id,
      position: techNodePixel(row.position, gridbox),
      type: TECH_NODE_TYPE,
    });
    rendered.add(row.id);
  }

  appendSubNodes(nodes, rows, rendered);

  const edges: Edge[] = [];
  const dependencyEdges: Edge[] = [];
  for (const row of rows) {
    if (!rendered.has(row.id)) {
      continue;
    }
    for (const target of row.pathTargets) {
      if (rendered.has(target)) {
        edges.push({ id: `${row.id}->${target}`, source: row.id, target });
      }
    }
    for (const target of row.dependencyTargets) {
      if (rendered.has(target)) {
        dependencyEdges.push({
          data: { kind: 'dependency' },
          id: `dep:${row.id}->${target}`,
          source: row.id,
          style: DEPENDENCY_EDGE_STYLE,
          target,
        });
      }
    }
  }

  return { dependencyEdges, edges, nodes };
}

// Attaches each `sub` technology (no own position) to the rendered parent that
// lists it in `subTechnologies`, as a react-flow child node. Mutates `nodes` and
// `rendered` in place.
function appendSubNodes(
  nodes: TechFlowNode[],
  rows: readonly TechnologySlim[],
  rendered: Set<string>,
): void {
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const parent of rows) {
    if (!rendered.has(parent.id)) {
      continue;
    }
    let stack = 0;
    for (const childId of parent.subTechnologies) {
      const child = byId.get(childId);
      if (child === undefined || child.position !== null) {
        continue;
      }
      nodes.push({
        data: {
          categories: child.categories,
          nodeKind: child.nodeKind,
          token: child.id,
        },
        id: child.id,
        parentId: parent.id,
        position: { x: SUB_OFFSET_X, y: stack * SUB_STACK_STEP_Y },
        type: TECH_NODE_TYPE,
      });
      rendered.add(child.id);
      stack += 1;
    }
  }
}
