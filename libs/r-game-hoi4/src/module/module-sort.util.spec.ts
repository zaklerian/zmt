import { ModuleEntity } from '@contracts';
import { describe, expect, it } from 'vitest';

import { compareModuleEntities } from './module-sort.util';

function entity(name: string, category: string): ModuleEntity {
  return {
    category,
    costMaps: { build_cost_resources: [], dismantle_cost_resources: [] },
    name,
    node: null as unknown as ModuleEntity['node'],
    scalars: [],
    statBlocks: {
      add_average_stats: [],
      add_stats: [],
      multiply_stats: [],
    },
  };
}

describe('compareModuleEntities', () => {
  it('orders by category, then by name within a category', () => {
    const engineB = entity('bravo', 'engine');
    const engineA = entity('alpha', 'engine');
    const armor = entity('zulu', 'armor');

    expect(
      [engineB, engineA, armor]
        .sort(compareModuleEntities)
        .map((entry) => entry.name),
    ).toEqual(['zulu', 'alpha', 'bravo']);
  });
});
