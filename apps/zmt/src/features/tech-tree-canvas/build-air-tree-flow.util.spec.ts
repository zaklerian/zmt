import type { TechnologySlim, TechTreeFolderGeometry } from '@contracts';

import { describe, expect, it } from 'vitest';

import { buildAirTreeFlow } from './build-air-tree-flow.util';

const AIR_GEOMETRY: TechTreeFolderGeometry = {
  area: { height: 1300, width: 3720 },
  background: 'GFX_air_techtree_bg',
  folderId: 'air_techs_folder',
  gridboxes: [
    gridbox('generic_fighter_tree', 340, 32),
    gridbox('generic_strategic_bomber_tree', 1610, 32),
  ],
  yearAxis: [],
};

const ROWS: readonly TechnologySlim[] = [
  slim('generic_fighter', { x: 5, y: 2 }, ['early_fighter']),
  slim('early_fighter', { x: 5, y: 2 }, ['multi_role1'], ['cv_early_fighter']),
  // Carries a `dependencies` AND-edge (the game hides it) distinct from its `path`.
  {
    ...slim('multi_role1', { x: 11, y: 4 }, []),
    dependencyTargets: ['early_fighter'],
  },
  slim('generic_strategic_bomber', { x: 18, y: 2 }, ['strategic_bomber2']),
  slim('strategic_bomber2', { x: 22, y: 6 }, []),
  { ...slim('cv_early_fighter', null, []), nodeKind: 'sub' },
];

describe('buildAirTreeFlow', () => {
  it('places positioned nodes at their bound gridbox origin + cell × step', () => {
    const { nodes } = buildAirTreeFlow(ROWS, AIR_GEOMETRY);
    const at = (id: string) => nodes.find((n) => n.id === id)?.position;

    expect(at('multi_role1')).toEqual({ x: 1110, y: 312 });
    // Non-first gridbox — single-origin would misplace this one.
    expect(at('strategic_bomber2')).toEqual({ x: 3150, y: 452 });
  });

  it('renders a sub node adjacent to its parent, never at absolute 0,0', () => {
    const { nodes } = buildAirTreeFlow(ROWS, AIR_GEOMETRY);
    const sub = nodes.find((n) => n.id === 'cv_early_fighter');

    expect(sub?.parentId).toBe('early_fighter');
    expect(sub?.data.nodeKind).toBe('sub');
    expect(sub?.position).not.toEqual({ x: 0, y: 0 });
  });

  it('draws a path edge only between two rendered nodes', () => {
    const { edges } = buildAirTreeFlow(ROWS, AIR_GEOMETRY);
    const ids = edges.map((e) => e.id);

    expect(ids).toContain('generic_fighter->early_fighter');
    expect(ids).toContain('early_fighter->multi_role1');
    expect(ids).toContain('generic_strategic_bomber->strategic_bomber2');
    // No edge targets the sub (it has no path) or a missing node.
    expect(edges.every((e) => e.target !== 'cv_early_fighter')).toBe(true);
  });

  it('draws dependencies as a separate dashed overlay, kept off the solid path edges', () => {
    const { dependencyEdges, edges } = buildAirTreeFlow(ROWS, AIR_GEOMETRY);
    const dep = dependencyEdges.find(
      (e) => e.id === 'dep:multi_role1->early_fighter',
    );

    expect(dep?.source).toBe('multi_role1');
    expect(dep?.target).toBe('early_fighter');
    expect(dep?.data?.kind).toBe('dependency');
    expect(dep?.style?.strokeDasharray).toBeDefined();
    // The overlay is a distinct list — no dependency leaks into the solid path set.
    expect(edges.some((e) => e.id.startsWith('dep:'))).toBe(false);
  });

  it('draws a dependency edge only when both endpoints are rendered', () => {
    const rows: readonly TechnologySlim[] = [
      slim('generic_fighter', { x: 5, y: 2 }, ['multi_role1']),
      // Source renders (fighter component), but its dependency target is absent.
      {
        ...slim('multi_role1', { x: 11, y: 4 }, []),
        dependencyTargets: ['ghost_tech'],
      },
    ];
    const { dependencyEdges } = buildAirTreeFlow(rows, AIR_GEOMETRY);

    expect(dependencyEdges).toEqual([]);
  });
});

function gridbox(name: string, x: number, y: number) {
  return {
    area: null,
    axis: 'UP',
    name,
    origin: { x, y },
    step: { height: 70, width: 70 },
  };
}

function slim(
  id: string,
  position: { x: number; y: number } | null,
  pathTargets: readonly string[],
  subTechnologies: readonly string[] = [],
): TechnologySlim {
  return {
    categories: [],
    dependencyTargets: [],
    folderName: position === null ? null : 'air_techs_folder',
    id,
    nodeKind: position === null ? 'sub' : 'simple',
    pathTargets,
    position,
    startYear: null,
    subTechnologies,
  };
}
