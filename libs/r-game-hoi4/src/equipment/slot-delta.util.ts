import { EntityBlockDelta, EntityField } from '@contracts';

import { computeScalarDelta } from '../scalar-bag';

const DEFAULT_MODULES_BLOCK = 'default_modules';

// Diffs the current slot→module assignments against the open-time snapshot and
// wraps the result as the single default_modules block delta. A cleared slot
// drops out of the current set and surfaces as a removal; a newly filled slot is
// an addition; a retargeted slot is a change. Only the default_modules block is
// touched — every other block of the archetype is left untouched.
export function buildDefaultModulesDelta(
  snapshot: readonly EntityField[],
  assignments: Readonly<Record<string, string>>,
): EntityBlockDelta {
  const rows = Object.entries(assignments)
    .filter(([, moduleName]) => moduleName !== '')
    .map(([key, value]) => ({ key, value }));
  return {
    block: DEFAULT_MODULES_BLOCK,
    ...computeScalarDelta(snapshot, rows),
  };
}
