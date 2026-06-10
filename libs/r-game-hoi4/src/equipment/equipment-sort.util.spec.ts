import { EquipmentEntity } from '@contracts';
import { describe, expect, it } from 'vitest';

import { compareEquipmentEntities } from './equipment-sort.util';

function entity(
  name: string,
  classification: EquipmentEntity['classification'],
): EquipmentEntity {
  return {
    classification,
    kind: 'regular',
    name,
    node: null as unknown as EquipmentEntity['node'],
  };
}

describe('compareEquipmentEntities', () => {
  it('floats air first, then naval, land, unresolved, invalid', () => {
    const air = entity('z_air', {
      domain: 'air',
      status: 'classified',
      type: ['fighter'],
    });
    const naval = entity('a_naval', {
      domain: 'naval',
      status: 'classified',
      type: ['ship_hull'],
    });
    const land = entity('a_land', {
      domain: 'land',
      status: 'classified',
      type: ['armor'],
    });
    const unresolved = entity('a_unresolved', {
      archetypeRef: 'x',
      status: 'unresolved',
    });
    const invalid = entity('a_invalid', {
      reason: 'unknown-type',
      status: 'invalid',
    });

    const sorted = [invalid, unresolved, land, naval, air].sort(
      compareEquipmentEntities,
    );

    expect(sorted.map((entry) => entry.name)).toEqual([
      'z_air',
      'a_naval',
      'a_land',
      'a_unresolved',
      'a_invalid',
    ]);
  });

  it('orders by name within the same precedence group', () => {
    const bravo = entity('bravo', {
      domain: 'air',
      status: 'classified',
      type: ['fighter'],
    });
    const alpha = entity('alpha', {
      domain: 'air',
      status: 'classified',
      type: ['fighter'],
    });

    expect(
      [bravo, alpha].sort(compareEquipmentEntities).map((entry) => entry.name),
    ).toEqual(['alpha', 'bravo']);
  });
});
