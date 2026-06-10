import { ModuleDomain, ModuleEntity } from '@contracts';
import { describe, expect, it } from 'vitest';

import { mapModuleRow } from './module-row.util';

function entity(domain: ModuleDomain, category: string): ModuleEntity {
  return {
    category,
    domain,
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

const translate = (key: string): string => key;

describe('mapModuleRow', () => {
  it('renders air modules in the normal state', () => {
    const row = mapModuleRow(entity('air', 'engine'), translate);
    expect(row.state).toBe('normal');
    expect(row.cells).toEqual({
      category: 'engine',
      domain: 'plugin.hoi4:module.domain.air',
      name: 'test_module',
    });
  });

  it('mutes naval and land modules pending their forms', () => {
    expect(mapModuleRow(entity('naval', 'fire_control'), translate).state).toBe(
      'muted',
    );
    expect(mapModuleRow(entity('land', 'armor'), translate).state).toBe(
      'muted',
    );
  });

  it('warns on unclassified modules and dashes an empty category', () => {
    const row = mapModuleRow(entity('unclassified', ''), translate);
    expect(row.state).toBe('warning');
    expect(row.cells.category).toBe('—');
    expect(row.cells.domain).toBe('plugin.hoi4:module.domain.unclassified');
  });
});
