import { ModuleDomain, ModuleEntity } from '@contracts';
import { describe, expect, it } from 'vitest';

import { compareModuleEntities } from './module-sort.util';

function entity(
  name: string,
  domain: ModuleDomain,
  category: string,
): ModuleEntity {
  return {
    category,
    domain,
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
  it('floats air first, then naval, land, unclassified', () => {
    const air = entity('z_air', 'air', 'engine');
    const naval = entity('a_naval', 'naval', 'fire_control');
    const land = entity('a_land', 'land', 'armor');
    const unclassified = entity('a_unclassified', 'unclassified', '');

    const sorted = [unclassified, land, naval, air].sort(compareModuleEntities);

    expect(sorted.map((entry) => entry.name)).toEqual([
      'z_air',
      'a_naval',
      'a_land',
      'a_unclassified',
    ]);
  });

  it('orders by category, then name, within the same domain', () => {
    const engineB = entity('bravo', 'air', 'engine');
    const engineA = entity('alpha', 'air', 'engine');
    const armor = entity('zulu', 'air', 'armor');

    expect(
      [engineB, engineA, armor]
        .sort(compareModuleEntities)
        .map((entry) => entry.name),
    ).toEqual(['zulu', 'alpha', 'bravo']);
  });
});
