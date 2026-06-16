import {
  EntityBlockDelta,
  EntityField,
  EntityScalarDelta,
  ModuleStatBlock,
} from '@contracts';

import { computeScalarDelta, ScalarRow } from '../scalar-bag';

export interface ModuleBagSnapshot {
  readonly add_average_stats: readonly EntityField[];
  readonly add_stats: readonly EntityField[];
  readonly multiply_stats: readonly EntityField[];
  readonly scalars: readonly EntityField[];
}

export interface ModuleBagValues {
  readonly add_average_stats: readonly ScalarRow[];
  readonly add_stats: readonly ScalarRow[];
  readonly multiply_stats: readonly ScalarRow[];
  readonly scalars: readonly ScalarRow[];
}

// Render and delta order: add_stats, multiply_stats, add_average_stats. The
// sequence is meaningful (matches the in-game block order), so it is kept rather
// than alphabetized (R-CODE-9 array-literal carve-out).
export const MODULE_STAT_BLOCKS: readonly ModuleStatBlock[] = [
  'add_stats',
  'multiply_stats',
  'add_average_stats',
];

// Diffs every bag against its open-time snapshot and collects the non-empty
// block deltas. block is null for the top-level scalar bag and a one-element path
// (the stat-block name) for each stat sub-bag (ADR 019, amended ZMT-13). Block
// existence is the handler's call — it creates a block on first add and drops it
// when emptied — so only per-block adds/changes/removes are sent here.
export function computeModuleDeltas(
  snapshot: ModuleBagSnapshot,
  values: ModuleBagValues,
): EntityBlockDelta[] {
  const deltas: EntityBlockDelta[] = [];

  const topDelta = computeScalarDelta(
    snapshot.scalars,
    normalize(values.scalars),
  );
  if (!isEmptyDelta(topDelta)) deltas.push({ block: null, ...topDelta });

  for (const block of MODULE_STAT_BLOCKS) {
    const delta = computeScalarDelta(snapshot[block], normalize(values[block]));
    if (!isEmptyDelta(delta)) deltas.push({ block: [block], ...delta });
  }

  return deltas;
}

function isEmptyDelta(delta: EntityScalarDelta): boolean {
  return (
    delta.added.length === 0 &&
    delta.changed.length === 0 &&
    delta.removed.length === 0
  );
}

function normalize(rows: readonly ScalarRow[]): readonly ScalarRow[] {
  return rows.map((row) => ({ key: row.key.trim(), value: row.value }));
}
