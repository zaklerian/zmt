import type { TechnologySlim, TechTreeFolderGeometry } from '@contracts';

import { describe, expect, it } from 'vitest';

import { bindNodesToGridboxes } from './air-node-binding.util';

// Real-shape `air_techs_folder` geometry: four gridboxes at four origins, three of
// them named `{seedTechId}_tree`, the jet one seedless (binds nothing here).
const AIR_GEOMETRY: TechTreeFolderGeometry = {
  area: { height: 1300, width: 3720 },
  background: 'GFX_air_techtree_bg',
  folderId: 'air_techs_folder',
  gridboxes: [
    gridbox('tech_air_engine_jet_tree', 190, 172),
    gridbox('generic_fighter_tree', 340, 32),
    gridbox('generic_bomber_tree', 1075, 32),
    gridbox('generic_strategic_bomber_tree', 1610, 32),
  ],
  yearAxis: [],
};

// Three path-connected bands, each seeded by one hidden `generic_*` root, plus a
// sub with no position — the real BICE topology in miniature.
const ROWS: readonly TechnologySlim[] = [
  slim('generic_fighter', { x: 5, y: 2 }, ['early_fighter']),
  slim(
    'early_fighter',
    { x: 5, y: 2 },
    ['fighter1', 'multi_role1'],
    ['cv_early_fighter'],
  ),
  slim('fighter1', { x: 3, y: 4 }, []),
  slim('multi_role1', { x: 11, y: 4 }, []),
  slim('generic_bomber', { x: 8, y: 2 }, ['CAS1']),
  slim('CAS1', { x: 6, y: 4 }, []),
  slim('generic_strategic_bomber', { x: 18, y: 2 }, [
    'naval_bomber1',
    'strategic_bomber2',
  ]),
  slim('naval_bomber1', { x: 9, y: 4 }, []),
  slim('strategic_bomber2', { x: 22, y: 6 }, []),
  { ...slim('cv_early_fighter', null, []), nodeKind: 'sub' },
];

describe('bindNodesToGridboxes', () => {
  it('binds each tech to the gridbox of its path-component seed (name = {seed}_tree)', () => {
    const binding = bindNodesToGridboxes(ROWS, AIR_GEOMETRY);

    // Fighter band → generic_fighter_tree.
    expect(binding.get('multi_role1')?.name).toBe('generic_fighter_tree');
    expect(binding.get('fighter1')?.name).toBe('generic_fighter_tree');
    expect(binding.get('generic_fighter')?.name).toBe('generic_fighter_tree');
    // CAS band → generic_bomber_tree.
    expect(binding.get('CAS1')?.name).toBe('generic_bomber_tree');
    // Bomber band → generic_strategic_bomber_tree (a non-first gridbox).
    expect(binding.get('naval_bomber1')?.name).toBe(
      'generic_strategic_bomber_tree',
    );
    expect(binding.get('strategic_bomber2')?.name).toBe(
      'generic_strategic_bomber_tree',
    );
  });

  it('does not cross bands — cells interleave, so only the path component decides', () => {
    const binding = bindNodesToGridboxes(ROWS, AIR_GEOMETRY);

    // CAS1 (cell 6) and multi_role1 (cell 11) and naval_bomber1 (cell 9)
    // interleave in cell space yet land in three different gridboxes.
    expect(binding.get('CAS1')?.origin.x).toBe(1075);
    expect(binding.get('multi_role1')?.origin.x).toBe(340);
    expect(binding.get('naval_bomber1')?.origin.x).toBe(1610);
  });

  it('binds nothing to a gridbox whose seed tech is absent (the jet tree here)', () => {
    const binding = bindNodesToGridboxes(ROWS, AIR_GEOMETRY);

    expect(
      [...binding.values()].some((g) => g.name === 'tech_air_engine_jet_tree'),
    ).toBe(false);
  });

  // ZMT-51 gate 2: a freshly free-placed technology has no edges, so no component
  // claims it. Before the fallback it bound to nothing and rendered nowhere — it
  // vanished the moment it was saved. It now binds to the anchor gridbox, the same
  // frame Add measured its cell in, so it reloads where it was placed.
  it('falls back to the anchor gridbox for a positioned tech in no component', () => {
    const freePlaced = slim('experimental_jet', { x: 20, y: 2 }, []);

    const binding = bindNodesToGridboxes([...ROWS, freePlaced], AIR_GEOMETRY);

    expect(binding.get('experimental_jet')?.name).toBe(
      'tech_air_engine_jet_tree',
    );
  });

  it('lets the component rule win the moment the free-placed tech gains an edge', () => {
    const connected = slim('experimental_jet', { x: 20, y: 2 }, ['fighter1']);

    const binding = bindNodesToGridboxes([...ROWS, connected], AIR_GEOMETRY);

    expect(binding.get('experimental_jet')?.name).toBe('generic_fighter_tree');
  });

  it('leaves a sub-technology unbound — it has no position to place', () => {
    const binding = bindNodesToGridboxes(ROWS, AIR_GEOMETRY);

    expect(binding.has('cv_early_fighter')).toBe(false);
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
