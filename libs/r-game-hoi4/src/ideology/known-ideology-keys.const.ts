import { FieldSpec } from '@r-core';

// Field specs for the ideology edit form. Only intrinsic closed values carry
// validation; the world-tension scalars are free-text numbers. Order is the
// render order (semantic, R-CODE-9 carve-out).

// Modeled root scalar fields — the two world-tension impacts the real file
// carries. Everything else at the ideology root (`color`, `rules`, `modifiers`,
// `faction_modifiers`, `ai_*`, and any other root scalar) is carried lossless.
// The `types` keyed-object map needs no per-entry spec: each subideology is an
// open modifier prop-bag (ZMT-E15), not a fixed-field template.
export const IDEOLOGY_ROOT_SPECS: readonly FieldSpec[] = [
  'war_impact_on_world_tension',
  'faction_impact_on_world_tension',
];
