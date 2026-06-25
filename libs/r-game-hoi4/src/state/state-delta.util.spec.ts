import { KEYED_MAP_ENTRY_KEY, KEYED_MAP_ENTRY_ROWS } from '@r-core';
import { describe, expect, it } from 'vitest';

import { computeStateDeltas, StateSnapshot } from './state-delta.util';

// The state-wide building rows bind to the keyed-map sibling field-array
// (namedNestedRowsBinding('buildings')); the per-province building objects bind to
// the block name as keyed-map entries.
const BUILDINGS_ROWS = 'buildings__rows';

const snapshot: StateSnapshot = {
  bags: [
    {
      binding: 'resources',
      rows: [{ key: 'oil', value: '5' }],
      scope: ['resources'],
    },
    {
      binding: BUILDINGS_ROWS,
      rows: [{ key: 'infrastructure', value: '3' }],
      scope: ['buildings'],
    },
    {
      binding: 'history',
      rows: [{ key: 'owner', value: 'GER' }],
      scope: ['history'],
    },
  ],
  lists: [{ binding: 'provinces', scope: ['provinces'], values: ['1', '2'] }],
  provinceBuildings: [{ key: '14', rows: [{ key: 'naval_base', value: '4' }] }],
  root: [
    { key: 'id', value: '12' },
    { key: 'manpower', value: '1000' },
  ],
  rootKeys: ['id', 'manpower'],
};

// The unchanged form values: every surface seeded back exactly as the snapshot. A
// `buildings` entry is the reserved province-id map key plus its open building prop-bag.
function baseValues(): Record<string, unknown> {
  return {
    buildings: [
      {
        [KEYED_MAP_ENTRY_KEY]: '14',
        [KEYED_MAP_ENTRY_ROWS]: [{ key: 'naval_base', value: '4' }],
      },
    ],
    [BUILDINGS_ROWS]: [{ key: 'infrastructure', value: '3' }],
    history: [{ key: 'owner', value: 'GER' }],
    id: '12',
    manpower: '1000',
    provinces: ['1', '2'],
    resources: [{ key: 'oil', value: '5' }],
  };
}

function provincesOf(
  values: Record<string, unknown>,
): Record<string, unknown>[] {
  return values.buildings as Record<string, unknown>[];
}

describe('computeStateDeltas', () => {
  it('emits nothing when no surface changed', () => {
    expect(computeStateDeltas(snapshot, baseValues())).toEqual([]);
  });

  it('emits a root scalar change at block null and a resources change at its path', () => {
    const deltas = computeStateDeltas(snapshot, {
      ...baseValues(),
      manpower: '2000',
      resources: [{ key: 'oil', value: '7' }],
    });

    expect(deltas).toEqual([
      {
        added: [],
        block: null,
        changed: [{ key: 'manpower', value: '2000' }],
        removed: [],
      },
      {
        added: [],
        block: ['resources'],
        changed: [{ key: 'oil', value: '7' }],
        removed: [],
      },
    ]);
  });

  it('changes a building level within a province at the keyed two-element path', () => {
    const values = baseValues();
    provincesOf(values)[0][KEYED_MAP_ENTRY_ROWS] = [
      { key: 'naval_base', value: '5' },
    ];

    expect(computeStateDeltas(snapshot, values)).toEqual([
      {
        added: [],
        block: ['buildings', '14'],
        changed: [{ key: 'naval_base', value: '5' }],
        removed: [],
      },
    ]);
  });

  it('adds a building row to an existing province open map', () => {
    const values = baseValues();
    provincesOf(values)[0][KEYED_MAP_ENTRY_ROWS] = [
      { key: 'naval_base', value: '4' },
      { key: 'coastal_bunker', value: '2' },
    ];

    expect(computeStateDeltas(snapshot, values)).toEqual([
      {
        added: [{ key: 'coastal_bunker', value: '2' }],
        block: ['buildings', '14'],
        changed: [],
        removed: [],
      },
    ]);
  });

  it('adds a new province entry by materializing its keyed sub-block', () => {
    const values = baseValues();
    provincesOf(values).push({
      [KEYED_MAP_ENTRY_KEY]: '27',
      [KEYED_MAP_ENTRY_ROWS]: [{ key: 'bunker', value: '1' }],
    });

    expect(computeStateDeltas(snapshot, values)).toEqual([
      {
        added: [{ key: 'bunker', value: '1' }],
        block: ['buildings', '27'],
        changed: [],
        removed: [],
      },
    ]);
  });

  it('removes a province entry with a parent-scoped key removal', () => {
    const values = baseValues();
    values.buildings = [];

    expect(computeStateDeltas(snapshot, values)).toEqual([
      {
        added: [],
        block: ['buildings'],
        changed: [],
        removed: ['14'],
      },
    ]);
  });

  it('lowers province add and remove to bare value-list items at the provinces path', () => {
    const deltas = computeStateDeltas(snapshot, {
      ...baseValues(),
      provinces: ['2', '3'],
    });

    expect(deltas).toEqual([
      {
        added: [{ key: '3', value: null }],
        block: ['provinces'],
        changed: [],
        removed: ['1'],
      },
    ]);
  });

  it('omits unchanged surfaces and changes a state-wide building level (rows)', () => {
    const deltas = computeStateDeltas(snapshot, {
      ...baseValues(),
      [BUILDINGS_ROWS]: [{ key: 'infrastructure', value: '5' }],
    });

    expect(deltas).toEqual([
      {
        added: [],
        block: ['buildings'],
        changed: [{ key: 'infrastructure', value: '5' }],
        removed: [],
      },
    ]);
  });

  it('coalesces a state-wide row add and a province entry add as two deltas under buildings', () => {
    const values = baseValues();
    values[BUILDINGS_ROWS] = [
      { key: 'infrastructure', value: '3' },
      { key: 'air_base', value: '1' },
    ];
    provincesOf(values).push({
      [KEYED_MAP_ENTRY_KEY]: '27',
      [KEYED_MAP_ENTRY_ROWS]: [{ key: 'bunker', value: '1' }],
    });

    expect(computeStateDeltas(snapshot, values)).toEqual([
      {
        added: [{ key: 'air_base', value: '1' }],
        block: ['buildings'],
        changed: [],
        removed: [],
      },
      {
        added: [{ key: 'bunker', value: '1' }],
        block: ['buildings', '27'],
        changed: [],
        removed: [],
      },
    ]);
  });
});
