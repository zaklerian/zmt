import { ModuleEntity } from '@contracts';
import { EntityToolbarContext } from '@r-core';
import { describe, expect, it } from 'vitest';

import { buildModuleActions } from './module-actions';

function entity(name: string, domain: ModuleEntity['domain']): ModuleEntity {
  return {
    category: 'engine',
    domain,
    name,
    node: null as unknown as ModuleEntity['node'],
    scalars: [],
    statBlocks: { add_average_stats: [], add_stats: [], multiply_stats: [] },
  };
}

const entities = [
  entity('air_mod', 'air'),
  entity('naval_mod', 'naval'),
  entity('land_mod', 'land'),
  entity('unclassified_mod', 'unclassified'),
];

const actionById = new Map(
  buildModuleActions(
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
    presentForm: () => undefined,
    refresh: () => undefined,
    relativePath: 'common/units/equipment/modules/00_air.txt',
    selectedRowId,
    writable,
  };
}

function isAvailable(id: string, context: EntityToolbarContext): boolean {
  return actionById.get(id)?.isAvailable(context) ?? false;
}

describe('module toolbar action availability', () => {
  it('exposes only Edit and Delete (Add is not wired)', () => {
    expect([...actionById.keys()].sort()).toEqual([
      'hoi4-module-delete',
      'hoi4-module-edit',
    ]);
  });

  for (const id of ['hoi4-module-edit', 'hoi4-module-delete']) {
    it(`enables ${id} only for an air row on a writable file`, () => {
      expect(isAvailable(id, context('air_mod', true))).toBe(true);
      expect(isAvailable(id, context('air_mod', false))).toBe(false);
      expect(isAvailable(id, context(null, true))).toBe(false);
      for (const row of ['naval_mod', 'land_mod', 'unclassified_mod']) {
        expect(isAvailable(id, context(row, true))).toBe(false);
      }
    });
  }
});
