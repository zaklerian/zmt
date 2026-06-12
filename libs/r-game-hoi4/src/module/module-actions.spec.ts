import { ModuleEntity } from '@contracts';
import { EntityToolbarContext } from '@r-core';
import { describe, expect, it } from 'vitest';

import { buildModuleActions } from './module-actions';

function entity(name: string): ModuleEntity {
  return {
    category: 'engine',
    name,
    node: null as unknown as ModuleEntity['node'],
    scalars: [],
    statBlocks: { add_average_stats: [], add_stats: [], multiply_stats: [] },
  };
}

const entities = [entity('engine_mod'), entity('battery_mod')];

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
    it(`enables ${id} for any selected row on a writable file`, () => {
      expect(isAvailable(id, context('engine_mod', true))).toBe(true);
      expect(isAvailable(id, context('battery_mod', true))).toBe(true);
      expect(isAvailable(id, context('engine_mod', false))).toBe(false);
      expect(isAvailable(id, context(null, true))).toBe(false);
    });
  }
});
