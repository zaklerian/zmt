import type { TechTreeGridbox } from '@contracts';

import { describe, expect, it } from 'vitest';

import { techNodePixel } from './tech-node-pixel.util';

// Real-shape gridboxes from BICE's `air_techs_folder` (countrytechtreeview.gui).
// The four sit at four different origins; here are the two the assertions bind to.
const GENERIC_FIGHTER_TREE: TechTreeGridbox = {
  area: { height: 1000, width: 400 },
  axis: 'UP',
  name: 'generic_fighter_tree',
  origin: { x: 340, y: 32 },
  step: { height: 70, width: 70 },
};

const GENERIC_STRATEGIC_BOMBER_TREE: TechTreeGridbox = {
  area: { height: 1000, width: 200 },
  axis: 'UP',
  name: 'generic_strategic_bomber_tree',
  origin: { x: 1610, y: 32 },
  step: { height: 70, width: 70 },
};

describe('techNodePixel', () => {
  it('places a cell at the gridbox origin + cell × step', () => {
    // multi_role1: cell (11, 4) in the fighter gridbox → 340+11×70, 32+4×70.
    expect(
      techNodePixel({ x: 11, y: 4 }, GENERIC_FIGHTER_TREE),
    ).toEqual({ x: 1110, y: 312 });
  });

  it('measures from the BOUND gridbox origin — a non-first gridbox single-origin would misplace', () => {
    // strategic_bomber2: cell (22, 6) in the strategic-bomber gridbox → 3150, 452.
    // A single per-folder origin (e.g. the fighter gridbox at 340) would put it at
    // 340+22×70 = 1880 — the exact defect the local-origin binding avoids.
    expect(
      techNodePixel({ x: 22, y: 6 }, GENERIC_STRATEGIC_BOMBER_TREE),
    ).toEqual({ x: 3150, y: 452 });
    expect(
      techNodePixel({ x: 22, y: 6 }, GENERIC_FIGHTER_TREE).x,
    ).not.toBe(3150);
  });

  it('handles a negative cell (a tech left of the gridbox origin)', () => {
    // heavy_fighter cells sit at @HV_FTR = -1 in the fighter gridbox.
    expect(
      techNodePixel({ x: -1, y: 2 }, GENERIC_FIGHTER_TREE),
    ).toEqual({ x: 270, y: 172 });
  });
});
