import { ModuleEntity } from '@contracts';
import { describe, expect, it } from 'vitest';

import { mapModuleRow } from './module-row.util';

function entity(category: string): ModuleEntity {
  return {
    category,
    costMaps: { build_cost_resources: [], dismantle_cost_resources: [] },
    name: 'test_module',
    node: null as unknown as ModuleEntity['node'],
    scalars: [],
    statBlocks: {
      add_average_stats: [],
      add_stats: [],
      multiply_stats: [],
    },
  };
}

describe('mapModuleRow', () => {
  it('renders a module in the normal state with its name and category', () => {
    const row = mapModuleRow(entity('engine'));
    expect(row.state).toBe('normal');
    expect(row.cells).toEqual({
      category: 'engine',
      name: 'test_module',
    });
  });

  it('dashes an empty category', () => {
    const row = mapModuleRow(entity(''));
    expect(row.cells.category).toBe('—');
  });
});
