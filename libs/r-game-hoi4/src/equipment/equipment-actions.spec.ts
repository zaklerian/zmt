import { EquipmentEntity } from '@contracts';
import { EntityToolbarContext } from '@r-core';
import { describe, expect, it } from 'vitest';

import { buildEquipmentActions } from './equipment-actions';

function entity(
  name: string,
  classification: EquipmentEntity['classification'],
  kind: EquipmentEntity['kind'] = 'regular',
): EquipmentEntity {
  return {
    classification,
    kind,
    name,
    node: null as unknown as EquipmentEntity['node'],
    scalars: [],
  };
}

const entities = [
  entity('air_eq', { domain: 'air', status: 'classified', type: ['fighter'] }),
  entity(
    'air_arch',
    { domain: 'air', status: 'classified', type: ['fighter'] },
    'archetype',
  ),
  entity(
    'land_arch',
    { domain: 'land', status: 'classified', type: ['armor'] },
    'archetype',
  ),
  entity('naval_eq', { domain: 'naval', status: 'classified', type: ['ship'] }),
  entity('land_eq', { domain: 'land', status: 'classified', type: ['armor'] }),
  entity('unresolved_eq', { archetypeRef: 'x', status: 'unresolved' }),
  entity('invalid_eq', { reason: 'unknown-type', status: 'invalid' }),
];

const actionById = new Map(
  buildEquipmentActions(
    new Map(entities.map((entry) => [entry.name, entry])),
    (key) => key,
  ).map((action) => [action.id, action]),
);

function context(
  selectedRowId: null | string,
  writable: boolean,
): EntityToolbarContext {
  return {
    dismissForm: () => undefined,
    modal: {
      confirm: () => Promise.resolve(false),
      info: () => Promise.resolve(),
    },
    modId: 'mod-a',
    presentEntityForm: () => undefined,
    presentForm: () => undefined,
    refresh: () => undefined,
    relativePath: 'common/units/equipment/air.txt',
    selectedRowId,
    writable,
  };
}

function isAvailable(id: string, context: EntityToolbarContext): boolean {
  return actionById.get(id)?.isAvailable(context) ?? false;
}

describe('equipment toolbar action availability', () => {
  it('enables Edit only for a classified-air row on a writable file', () => {
    expect(isAvailable('hoi4-equipment-edit', context('air_eq', true))).toBe(
      true,
    );
  });

  it('disables Edit for naval, land, unresolved, and invalid rows', () => {
    for (const id of ['naval_eq', 'land_eq', 'unresolved_eq', 'invalid_eq']) {
      expect(isAvailable('hoi4-equipment-edit', context(id, true))).toBe(false);
    }
  });

  it('disables Edit on a readonly file even for a classified-air row', () => {
    expect(isAvailable('hoi4-equipment-edit', context('air_eq', false))).toBe(
      false,
    );
  });

  it('disables Edit when no row is selected', () => {
    expect(isAvailable('hoi4-equipment-edit', context(null, true))).toBe(false);
  });

  it('enables Design modules only for a writable air archetype', () => {
    const id = 'hoi4-equipment-design-modules';
    expect(isAvailable(id, context('air_arch', true))).toBe(true);
    expect(isAvailable(id, context('air_arch', false))).toBe(false);
    expect(isAvailable(id, context('air_eq', true))).toBe(false);
    expect(isAvailable(id, context('land_arch', true))).toBe(false);
    expect(isAvailable(id, context(null, true))).toBe(false);
  });

  it('enables Add whenever the file is writable', () => {
    expect(isAvailable('hoi4-equipment-add', context(null, true))).toBe(true);
    expect(isAvailable('hoi4-equipment-add', context(null, false))).toBe(false);
  });

  it('enables Delete for any selected row on a writable file', () => {
    expect(
      isAvailable('hoi4-equipment-delete', context('invalid_eq', true)),
    ).toBe(true);
    expect(isAvailable('hoi4-equipment-delete', context(null, true))).toBe(
      false,
    );
    expect(
      isAvailable('hoi4-equipment-delete', context('invalid_eq', false)),
    ).toBe(false);
  });
});
