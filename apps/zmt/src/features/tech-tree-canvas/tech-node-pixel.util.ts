import type {
  TechnologyPosition,
  TechTreeGridbox,
  TechTreePoint,
} from '@contracts';

// Places a technology's grid cell into pixel space within ONE gridbox:
// `origin + cell × slotsize` (ADR 026 decision 3). The origin is the bound
// gridbox's, never a single per-folder origin — a folder's gridboxes sit at
// different origins and each tech's cell is LOCAL to its gridbox (ZMT-43
// grounding). BICE's air gridboxes are uniformly `format = "UP"`, which grounds
// to straight positive growth on both axes — verified against the folder's year
// gutter (row `cell.y × step` lands on the printed year label). Other `format`
// values do not occur in the air data and are deliberately not speculatively
// handled; `gridbox.axis` carries the value for when a later ticket grounds them.
export function techNodePixel(
  cell: TechnologyPosition,
  gridbox: TechTreeGridbox,
): TechTreePoint {
  return {
    x: gridbox.origin.x + cell.x * gridbox.step.width,
    y: gridbox.origin.y + cell.y * gridbox.step.height,
  };
}
