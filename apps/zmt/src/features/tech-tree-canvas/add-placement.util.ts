import type {
  TechnologyPosition,
  TechTreeFolderGeometry,
  TechTreeGridbox,
  TechTreePoint,
  TechTreeYearLabel,
} from '@contracts';

import { techNodePixel } from './tech-node-pixel.util';

// Placement math for Add (ZMT-51), BASELINE — correct and reload-stable, not
// clever. Grounded against BICE `air_techs_folder`; the run report is
// `docs/grounding/ZMT-51-add-placement-grounding.md`.
//
// WHY THERE IS NO "CONTAINING GRIDBOX" HERE. The ticket's free-placement rule was
// "write the position relative to the gridbox whose declared AREA contains the
// click". That rule is UNGROUNDABLE against the geometry, and implementing it
// would misplace nodes (standing acceptance criterion → implement what the data
// shows, flag the divergence). BICE's four `air_techs_folder` gridboxes declare
// `size` areas that do not contain the technologies bound to them:
//
//   gridbox                          declared area x   its techs render at x
//   tech_air_engine_jet_tree         (none declared)   binds no technology
//   generic_fighter_tree             340 – 740         270 – 1110
//   generic_bomber_tree              1075 – 1475       1495 – 1775  (disjoint)
//   generic_strategic_bomber_tree    1610 – 1810       2240 – 3430  (disjoint)
//
// Two of the three areas are disjoint from their own content, and one area
// (`generic_bomber_tree`, 1075–1475) covers pixels where FIGHTER-component nodes
// actually render — so an area hit-test would hand a click to the gridbox whose
// nodes are elsewhere. Most of the canvas is covered by no area at all.
//
// The baseline rule implemented instead: a disconnected technology's position is
// measured in the folder's ANCHOR gridbox — the first declared one. This is the
// only rule that keeps the ticket's actual gate ("a disconnected tech reloads
// where it was placed"): the written data is a cell and `folder.name`, nothing
// records which gridbox it was measured in, so the write frame and the reload
// frame must be the SAME deterministic function of the folder — and any rule that
// picks a frame per click cannot be inverted from the cell alone. In BICE the
// anchor happens to be `tech_air_engine_jet_tree`, the one gridbox no component
// binds to, so free placement never fights the ZMT-43 component rule.
//
// Snap-on-connect — moving a free-placed tech into its component's frame once it
// gains an edge — is explicitly the refactor's job, not this ticket's.

// The cell offset from an invoking technology to the one added below it. BICE's
// air families step exactly one year-row per tier at a fixed column (`@MTR` at
// `@1936`=4, `@1940`=6, `@1944`=8), and the folder's year symbols are two cells
// apart, so "the next tier down, same column" is `y + 2`.
export const CHILD_CELL_OFFSET: TechnologyPosition = { x: 0, y: 2 };

// How far the safe-position nudge searches before giving up and placing on top.
// A ring this wide is 33 × 33 cells — far past any real crowding; the cap exists
// so a pathological occupancy set cannot spin.
const MAX_NUDGE_RING = 16;

// The gridbox a technology with no component binds to (see the header). Null when
// the folder declares no gridbox at all, in which case nothing can be placed.
export function anchorGridbox(
  geometry: TechTreeFolderGeometry,
): null | TechTreeGridbox {
  return geometry.gridboxes[0] ?? null;
}

// The cell a pixel lands on within one gridbox — the inverse of `techNodePixel`,
// rounded to the nearest cell. Cells are NOT clamped to zero: BICE authors
// negative columns (`@HV_FTR = -1`), so a negative cell is real data, not an
// error.
export function cellFromPixel(
  pixel: TechTreePoint,
  gridbox: TechTreeGridbox,
): TechnologyPosition {
  return {
    x: Math.round((pixel.x - gridbox.origin.x) / gridbox.step.width),
    y: Math.round((pixel.y - gridbox.origin.y) / gridbox.step.height),
  };
}

// A cell's identity as a map key.
export function cellKey(cell: TechnologyPosition): string {
  return `${String(cell.x)},${String(cell.y)}`;
}

// The gutter year printed against a pixel row (ADR 028 decision 2: this seeds the
// new technology's `start_year` DEFAULT and nothing else — `start_year`,
// `position.y`, and the gutter year stay three distinct quantities, ADR 025).
//
// Matched by nearest label in absolute pixel space rather than by cell: the year
// labels and the gridboxes are siblings in the same `.gui` container, but each
// gridbox applies its own origin, so a cell means a different row per gridbox
// while a pixel does not. In BICE every air row lands 32px below its label —
// well inside the 140px label spacing — so nearest-label is exact for all six.
export function gutterYearAt(
  pixelY: number,
  yearAxis: readonly TechTreeYearLabel[],
): null | number {
  let best: null | TechTreeYearLabel = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const label of yearAxis) {
    const distance = Math.abs(label.position.y - pixelY);
    if (distance < bestDistance) {
      best = label;
      bestDistance = distance;
    }
  }
  if (best === null) return null;
  // The printed text is the year the player reads; the `pdx_tooltip` token is the
  // fallback because BICE prints a label ("1945") under a tooltip naming a
  // different year (`YEAR_1946`) — the two are distinct and text wins.
  return yearOf(best.text) ?? yearOf(best.tooltip);
}

// The safe position (ticket gate 6): if the target cell's PIXEL is already taken,
// step out to the nearest free cell rather than stacking two nodes. Occupancy is
// compared in pixel space because the canvas draws every gridbox's nodes into one
// plane — a cell collision inside one gridbox and a visual collision across two
// are the same defect, and only pixels see both.
export function nudgeToFreeCell(
  cell: TechnologyPosition,
  gridbox: TechTreeGridbox,
  occupiedPixels: ReadonlySet<string>,
): TechnologyPosition {
  for (let ring = 0; ring <= MAX_NUDGE_RING; ring += 1) {
    for (let dy = -ring; dy <= ring; dy += 1) {
      for (let dx = -ring; dx <= ring; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const candidate = { x: cell.x + dx, y: cell.y + dy };
        if (!occupiedPixels.has(pixelKey(techNodePixel(candidate, gridbox)))) {
          return candidate;
        }
      }
    }
  }
  return cell;
}

// A rendered node's pixel identity, the key `nudgeToFreeCell` tests against.
export function pixelKey(pixel: TechTreePoint): string {
  return `${String(pixel.x)},${String(pixel.y)}`;
}

function yearOf(text: null | string): null | number {
  if (text === null) return null;
  const digits = /\d{3,4}/.exec(text);
  return digits === null ? null : Number(digits[0]);
}
