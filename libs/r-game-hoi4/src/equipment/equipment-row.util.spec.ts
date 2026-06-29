import { EquipmentEntity } from '@contracts';
import { describe, expect, it } from 'vitest';

import { mapEquipmentRow } from './equipment-row.util';

const translate = (key: string): string => key;

function entity(
  classification: EquipmentEntity['classification'],
  overrides: Partial<EquipmentEntity> = {},
): EquipmentEntity {
  return {
    classification,
    kind: 'regular',
    name: 'test_eq',
    node: null as unknown as EquipmentEntity['node'],
    ...overrides,
  };
}

describe('mapEquipmentRow', () => {
  it('maps a classified air entity to a normal row with joined types', () => {
    const row = mapEquipmentRow(
      entity(
        { domain: 'air', status: 'classified', type: ['fighter', 'cas'] },
        { kind: 'archetype', name: 'fighter_equipment' },
      ),
      translate,
    );

    expect(row).toEqual({
      cells: {
        domain: 'plugin.hoi4:equipment.domain.air',
        kind: 'archetype',
        name: 'fighter_equipment',
        type: 'fighter, cas',
      },
      id: 'fighter_equipment',
      state: 'normal',
    });
  });

  it('maps classified naval and land entities to muted rows', () => {
    expect(
      mapEquipmentRow(
        entity({ domain: 'naval', status: 'classified', type: ['ship_hull'] }),
        translate,
      ).state,
    ).toBe('muted');
    expect(
      mapEquipmentRow(
        entity({ domain: 'land', status: 'classified', type: ['armor'] }),
        translate,
      ).state,
    ).toBe('muted');
  });

  it('maps an unresolved regular entity to a neutral row with "—" domain and type', () => {
    const row = mapEquipmentRow(
      entity({ archetypeRef: 'missing_archetype', status: 'unresolved' }),
      translate,
    );

    expect(row.state).toBe('muted');
    expect(row.cells.domain).toBe('—');
    expect(row.cells.type).toBe('—');
  });

  it('maps an invalid regular entity to a neutral row with "—" domain and type', () => {
    const row = mapEquipmentRow(
      entity({ reason: 'regular-ref-not-typed', status: 'invalid' }),
      translate,
    );

    expect(row.state).toBe('muted');
    expect(row.cells.domain).toBe('—');
    expect(row.cells.type).toBe('—');
  });

  it('maps an invalid archetype entity to an error row', () => {
    const row = mapEquipmentRow(
      entity(
        { reason: 'archetype-missing-type', status: 'invalid' },
        { kind: 'archetype', name: 'broken_archetype' },
      ),
      translate,
    );

    expect(row.state).toBe('error');
    expect(row.cells.domain).toBe('plugin.hoi4:equipment.status.invalid');
    expect(row.cells.type).toBe('—');
  });
});
