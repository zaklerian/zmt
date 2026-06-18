import { describe, expect, it } from 'vitest';

import { computeStateDeltas, StateSnapshot } from './state-delta.util';

const snapshot: StateSnapshot = {
  bags: [
    {
      binding: 'resources',
      rows: [{ key: 'oil', value: '5' }],
      scope: ['resources'],
    },
    {
      binding: 'buildings',
      rows: [{ key: 'infrastructure', value: '3' }],
      scope: ['buildings'],
    },
    {
      binding: 'naval_base',
      rows: [],
      scope: ['buildings', 'naval_base'],
    },
    {
      binding: 'history',
      rows: [{ key: 'owner', value: 'GER' }],
      scope: ['history'],
    },
  ],
  lists: [{ binding: 'provinces', scope: ['provinces'], values: ['1', '2'] }],
  root: [
    { key: 'id', value: '12' },
    { key: 'manpower', value: '1000' },
  ],
  rootKeys: ['id', 'manpower'],
};

function baseValues(): Record<string, unknown> {
  return {
    buildings: [{ key: 'infrastructure', value: '3' }],
    history: [{ key: 'owner', value: 'GER' }],
    id: '12',
    manpower: '1000',
    naval_base: [],
    provinces: ['1', '2'],
    resources: [{ key: 'oil', value: '5' }],
  };
}

describe('computeStateDeltas', () => {
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

  it('adds a naval_base entry at the two-element depth-2 path', () => {
    const deltas = computeStateDeltas(snapshot, {
      ...baseValues(),
      naval_base: [{ key: '1234', value: '1' }],
    });

    expect(deltas).toEqual([
      {
        added: [{ key: '1234', value: '1' }],
        block: ['buildings', 'naval_base'],
        changed: [],
        removed: [],
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

  it('omits unchanged surfaces and changes a building level (rows)', () => {
    const deltas = computeStateDeltas(snapshot, {
      ...baseValues(),
      buildings: [{ key: 'infrastructure', value: '5' }],
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
});
