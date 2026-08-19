import type { TechTreeFolderGeometry, TechTreeGridbox } from '@contracts';

import { describe, expect, it } from 'vitest';

import {
  anchorGridbox,
  cellFromPixel,
  CHILD_CELL_OFFSET,
  gutterYearAt,
  nudgeToFreeCell,
  pixelKey,
} from './add-placement.util';
import { techNodePixel } from './tech-node-pixel.util';

// ZMT-51 regression gates 2 and 6, over the REAL BICE `air_techs_folder` numbers
// (`interface/countrytechtreeview.gui`, run report
// `docs/grounding/ZMT-51-add-placement-grounding.md`): four gridboxes at four
// origins, `slotsize 70`, and the six year labels of the left gutter.
const AIR_GEOMETRY: TechTreeFolderGeometry = {
  area: { height: 1300, width: 3720 },
  background: 'GFX_air_techtree_bg',
  folderId: 'air_techs_folder',
  gridboxes: [
    gridbox('tech_air_engine_jet_tree', 190, 172, null),
    gridbox('generic_fighter_tree', 340, 32, { height: 1000, width: 400 }),
    gridbox('generic_bomber_tree', 1075, 32, { height: 1000, width: 400 }),
    gridbox('generic_strategic_bomber_tree', 1610, 32, {
      height: 1000,
      width: 200,
    }),
  ],
  yearAxis: [
    year(140, '1933', 'YEAR_1933'),
    year(280, '1936', 'YEAR_1936'),
    year(420, '1940', 'YEAR_1940'),
    year(560, '1944', 'YEAR_1944'),
    year(700, '1945', 'YEAR_1946'),
    year(840, '1946', 'YEAR_1946'),
  ],
};

const ANCHOR = AIR_GEOMETRY.gridboxes[0];

describe('anchorGridbox — the frame a disconnected technology is measured in', () => {
  it('is the folder’s first declared gridbox', () => {
    expect(anchorGridbox(AIR_GEOMETRY)?.name).toBe('tech_air_engine_jet_tree');
  });

  it('is null for a folder that declares no gridbox — nothing can be placed', () => {
    expect(anchorGridbox({ ...AIR_GEOMETRY, gridboxes: [] })).toBeNull();
  });

  // The rule the ticket asked for and the data refused (see the util's header):
  // two of the three declared areas do not contain their own technologies, and
  // `generic_bomber_tree`'s area covers pixels where FIGHTER nodes render. Pinned
  // as a spec so the divergence is a checked fact, not a claim in a PR body.
  it('is NOT an area hit-test — the declared areas do not contain their own nodes', () => {
    const bomber = AIR_GEOMETRY.gridboxes[2];
    // CAS1 (cell 6,4) is bound to `generic_bomber_tree` by its path component…
    const cas1 = techNodePixel({ x: 6, y: 4 }, bomber);
    expect(cas1.x).toBe(1495);
    // …yet lands OUTSIDE that gridbox's own declared area (1075–1475).
    expect(cas1.x).toBeGreaterThan(bomber.origin.x + (bomber.area?.width ?? 0));
    // And a click inside that area lands on the FIGHTER band's content instead.
    const fighter = AIR_GEOMETRY.gridboxes[1];
    expect(techNodePixel({ x: 11, y: 4 }, fighter).x).toBe(1110);
  });
});

describe('cellFromPixel — free placement round-trips through the anchor (gate 2)', () => {
  it('inverts techNodePixel exactly on a cell-aligned click', () => {
    const cell = { x: 7, y: 3 };
    const pixel = techNodePixel(cell, ANCHOR);

    expect(cellFromPixel(pixel, ANCHOR)).toEqual(cell);
  });

  it('reloads a free-placed technology at the cell it was written to', () => {
    // Place at an arbitrary click, write the cell, then re-derive the pixel the
    // way the reload binding does: the anchor is both the write frame and the
    // fallback frame, so the node comes back within half a cell of the click.
    const click = { x: 1603, y: 318 };
    const cell = cellFromPixel(click, ANCHOR);
    const reloaded = techNodePixel(cell, ANCHOR);

    expect(cell).toEqual({ x: 20, y: 2 });
    expect(Math.abs(reloaded.x - click.x)).toBeLessThanOrEqual(35);
    expect(Math.abs(reloaded.y - click.y)).toBeLessThanOrEqual(35);
  });

  it('keeps negative columns — BICE authors `@HV_FTR = -1`', () => {
    expect(cellFromPixel({ x: ANCHOR.origin.x - 70, y: 172 }, ANCHOR).x).toBe(
      -1,
    );
  });
});

describe('gutterYearAt — the start_year default (ADR 028 decision 2)', () => {
  it('reads the year printed against each real air row', () => {
    const fighterTree = AIR_GEOMETRY.gridboxes[1];
    const yearAt = (cellY: number) =>
      gutterYearAt(
        techNodePixel({ x: 0, y: cellY }, fighterTree).y,
        AIR_GEOMETRY.yearAxis,
      );

    expect(yearAt(2)).toBe(1933);
    expect(yearAt(4)).toBe(1936);
    expect(yearAt(6)).toBe(1940);
    expect(yearAt(8)).toBe(1944);
    expect(yearAt(12)).toBe(1946);
  });

  it('prefers the printed text over the tooltip — BICE prints 1945 under YEAR_1946', () => {
    expect(gutterYearAt(700, AIR_GEOMETRY.yearAxis)).toBe(1945);
  });

  it('falls back to the tooltip when the label prints no year', () => {
    expect(gutterYearAt(140, [year(140, null, 'YEAR_1933')])).toBe(1933);
  });

  it('is null for a folder with no year gutter — the doctrine folders', () => {
    expect(gutterYearAt(312, [])).toBeNull();
  });
});

describe('nudgeToFreeCell — the safe position (gate 6)', () => {
  it('keeps the target cell when nothing occupies it', () => {
    expect(nudgeToFreeCell({ x: 5, y: 6 }, ANCHOR, new Set())).toEqual({
      x: 5,
      y: 6,
    });
  });

  it('steps to an adjacent free cell rather than stacking two nodes', () => {
    const occupied = new Set([pixelKey(techNodePixel({ x: 5, y: 6 }, ANCHOR))]);

    const nudged = nudgeToFreeCell({ x: 5, y: 6 }, ANCHOR, occupied);

    expect(nudged).not.toEqual({ x: 5, y: 6 });
    expect(Math.max(Math.abs(nudged.x - 5), Math.abs(nudged.y - 6))).toBe(1);
  });

  it('walks out until it finds a free cell rather than stopping at the first ring', () => {
    const fighterTree = AIR_GEOMETRY.gridboxes[1];
    // The whole 3 × 3 block around the add-as-child target is taken.
    const occupied = new Set<string>();
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        occupied.add(
          pixelKey(techNodePixel({ x: 5 + dx, y: 6 + dy }, fighterTree)),
        );
      }
    }

    const nudged = nudgeToFreeCell({ x: 5, y: 6 }, fighterTree, occupied);

    expect(Math.max(Math.abs(nudged.x - 5), Math.abs(nudged.y - 6))).toBe(2);
    expect(occupied.has(pixelKey(techNodePixel(nudged, fighterTree)))).toBe(
      false,
    );
  });

  // Occupancy is compared in PIXELS, not cells, because the canvas draws every
  // gridbox into one plane. In BICE that comparison never actually fires across
  // two gridboxes — the four origins are mutually misaligned modulo the 70px
  // step (340, 1075 and 1610 differ by 735 and 535), so no cell of one gridbox
  // shares a pixel with a cell of another. Pinned so a later geometry with
  // aligned origins is a change in behaviour, not a silent one.
  it('has no cross-gridbox pixel collisions in this geometry — the origins are misaligned', () => {
    const [, fighter, bomber, strategic] = AIR_GEOMETRY.gridboxes;
    for (const other of [bomber, strategic]) {
      expect((other.origin.x - fighter.origin.x) % fighter.step.width).not.toBe(
        0,
      );
    }
  });

  it('offsets an add-as-child one year-row below its parent', () => {
    expect(CHILD_CELL_OFFSET).toEqual({ x: 0, y: 2 });
  });
});

function gridbox(
  name: string,
  x: number,
  y: number,
  area: { height: number; width: number } | null,
): TechTreeGridbox {
  return {
    area,
    axis: 'UP',
    name,
    origin: { x, y },
    step: { height: 70, width: 70 },
  };
}

function year(y: number, text: null | string, tooltip: string) {
  return { position: { x: 10, y }, text, tooltip };
}
