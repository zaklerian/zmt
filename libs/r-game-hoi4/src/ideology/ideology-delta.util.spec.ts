import { KEYED_MAP_ENTRY_KEY, KEYED_MAP_ENTRY_ROWS } from '@r-core';
import { describe, expect, it } from 'vitest';

import { computeIdeologyDeltas, IdeologySnapshot } from './ideology-delta.util';

const snapshot: IdeologySnapshot = {
  dynamicFactionNames: ['FACTION_ONE'],
  root: [{ key: 'war_impact_on_world_tension', value: '0.5' }],
  rootKeys: ['war_impact_on_world_tension', 'faction_impact_on_world_tension'],
  types: [
    {
      key: 'liberalism',
      rows: [{ key: 'political_power_factor', value: '0.075' }],
    },
    { key: 'conservatism', rows: [] },
  ],
};

// The unchanged form values: every surface seeded back exactly as the snapshot.
// A `types` entry is the reserved map key plus its open prop-bag rows.
function baseValues(): Record<string, unknown> {
  return {
    dynamic_faction_names: ['FACTION_ONE'],
    faction_impact_on_world_tension: '',
    types: [
      {
        [KEYED_MAP_ENTRY_KEY]: 'liberalism',
        [KEYED_MAP_ENTRY_ROWS]: [
          { key: 'political_power_factor', value: '0.075' },
        ],
      },
      { [KEYED_MAP_ENTRY_KEY]: 'conservatism', [KEYED_MAP_ENTRY_ROWS]: [] },
    ],
    war_impact_on_world_tension: '0.5',
  };
}

function typesOf(values: Record<string, unknown>): Record<string, unknown>[] {
  return values.types as Record<string, unknown>[];
}

describe('computeIdeologyDeltas', () => {
  it('emits nothing when no surface changed', () => {
    expect(computeIdeologyDeltas(snapshot, baseValues())).toEqual([]);
  });

  it('emits a root scalar change at block null', () => {
    const deltas = computeIdeologyDeltas(snapshot, {
      ...baseValues(),
      war_impact_on_world_tension: '0.9',
    });

    expect(deltas).toEqual([
      {
        added: [],
        block: null,
        changed: [{ key: 'war_impact_on_world_tension', value: '0.9' }],
        removed: [],
      },
    ]);
  });

  it('changes an existing subideology modifier at the keyed two-element path', () => {
    const values = baseValues();
    typesOf(values)[0][KEYED_MAP_ENTRY_ROWS] = [
      { key: 'political_power_factor', value: '0.1' },
    ];

    expect(computeIdeologyDeltas(snapshot, values)).toEqual([
      {
        added: [],
        block: ['types', 'liberalism'],
        changed: [{ key: 'political_power_factor', value: '0.1' }],
        removed: [],
      },
    ]);
  });

  it('adds a modifier row to an existing subideology open map', () => {
    const values = baseValues();
    typesOf(values)[0][KEYED_MAP_ENTRY_ROWS] = [
      { key: 'political_power_factor', value: '0.075' },
      { key: 'drift_defence_factor', value: '0.5' },
    ];

    expect(computeIdeologyDeltas(snapshot, values)).toEqual([
      {
        added: [{ key: 'drift_defence_factor', value: '0.5' }],
        block: ['types', 'liberalism'],
        changed: [],
        removed: [],
      },
    ]);
  });

  it('removes a modifier row from an existing subideology open map', () => {
    const values = baseValues();
    typesOf(values)[0][KEYED_MAP_ENTRY_ROWS] = [];

    expect(computeIdeologyDeltas(snapshot, values)).toEqual([
      {
        added: [],
        block: ['types', 'liberalism'],
        changed: [],
        removed: ['political_power_factor'],
      },
    ]);
  });

  it('adds a new subideology with a modifier by materializing its keyed sub-block', () => {
    const values = baseValues();
    typesOf(values).push({
      [KEYED_MAP_ENTRY_KEY]: 'socialism',
      [KEYED_MAP_ENTRY_ROWS]: [
        { key: 'political_power_factor', value: '0.05' },
      ],
    });

    expect(computeIdeologyDeltas(snapshot, values)).toEqual([
      {
        added: [{ key: 'political_power_factor', value: '0.05' }],
        block: ['types', 'socialism'],
        changed: [],
        removed: [],
      },
    ]);
  });

  it('adds a bodyless subideology as an empty added-only delta', () => {
    const values = baseValues();
    typesOf(values).push({
      [KEYED_MAP_ENTRY_KEY]: 'vanguardism',
      [KEYED_MAP_ENTRY_ROWS]: [],
    });

    expect(computeIdeologyDeltas(snapshot, values)).toEqual([
      {
        added: [],
        block: ['types', 'vanguardism'],
        changed: [],
        removed: [],
      },
    ]);
  });

  it('removes a subideology with a parent-scoped key removal', () => {
    const values = baseValues();
    values.types = typesOf(values).filter(
      (entry) => entry[KEYED_MAP_ENTRY_KEY] !== 'conservatism',
    );

    expect(computeIdeologyDeltas(snapshot, values)).toEqual([
      {
        added: [],
        block: ['types'],
        changed: [],
        removed: ['conservatism'],
      },
    ]);
  });

  it('renames a subideology as remove-old-key plus add-new-key', () => {
    const values = baseValues();
    typesOf(values)[0] = {
      [KEYED_MAP_ENTRY_KEY]: 'progressivism',
      [KEYED_MAP_ENTRY_ROWS]: [
        { key: 'political_power_factor', value: '0.075' },
      ],
    };

    expect(computeIdeologyDeltas(snapshot, values)).toEqual([
      {
        added: [{ key: 'political_power_factor', value: '0.075' }],
        block: ['types', 'progressivism'],
        changed: [],
        removed: [],
      },
      {
        added: [],
        block: ['types'],
        changed: [],
        removed: ['liberalism'],
      },
    ]);
  });

  it('adds a dynamic faction name as a bare value-list token', () => {
    const deltas = computeIdeologyDeltas(snapshot, {
      ...baseValues(),
      dynamic_faction_names: ['FACTION_ONE', 'FACTION_TWO'],
    });

    expect(deltas).toEqual([
      {
        added: [{ key: 'FACTION_TWO', value: null }],
        block: ['dynamic_faction_names'],
        changed: [],
        removed: [],
      },
    ]);
  });
});
