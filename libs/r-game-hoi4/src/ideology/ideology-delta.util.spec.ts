import { KEYED_MAP_ENTRY_KEY } from '@r-core';
import { describe, expect, it } from 'vitest';

import { computeIdeologyDeltas, IdeologySnapshot } from './ideology-delta.util';

const snapshot: IdeologySnapshot = {
  dynamicFactionNames: ['FACTION_ONE'],
  root: [{ key: 'war_impact_on_world_tension', value: '0.5' }],
  rootKeys: ['war_impact_on_world_tension', 'faction_impact_on_world_tension'],
  typeFieldKeys: ['can_be_randomly_selected'],
  types: [
    {
      key: 'liberalism',
      rows: [{ key: 'can_be_randomly_selected', value: 'yes' }],
    },
    { key: 'conservatism', rows: [] },
  ],
};

// The unchanged form values: every surface seeded back exactly as the snapshot.
function baseValues(): Record<string, unknown> {
  return {
    dynamic_faction_names: ['FACTION_ONE'],
    faction_impact_on_world_tension: '',
    types: [
      { can_be_randomly_selected: 'yes', [KEYED_MAP_ENTRY_KEY]: 'liberalism' },
      { can_be_randomly_selected: '', [KEYED_MAP_ENTRY_KEY]: 'conservatism' },
    ],
    war_impact_on_world_tension: '0.5',
  };
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

  it('changes an existing subideology scalar at the keyed two-element path', () => {
    const values = baseValues();
    (values.types as Record<string, unknown>[])[0].can_be_randomly_selected =
      'no';

    expect(computeIdeologyDeltas(snapshot, values)).toEqual([
      {
        added: [],
        block: ['types', 'liberalism'],
        changed: [{ key: 'can_be_randomly_selected', value: 'no' }],
        removed: [],
      },
    ]);
  });

  it('adds a new subideology with a scalar by materializing its keyed sub-block', () => {
    const values = baseValues();
    (values.types as Record<string, unknown>[]).push({
      can_be_randomly_selected: 'yes',
      [KEYED_MAP_ENTRY_KEY]: 'socialism',
    });

    expect(computeIdeologyDeltas(snapshot, values)).toEqual([
      {
        added: [{ key: 'can_be_randomly_selected', value: 'yes' }],
        block: ['types', 'socialism'],
        changed: [],
        removed: [],
      },
    ]);
  });

  it('adds a bodyless subideology as an empty added-only delta', () => {
    const values = baseValues();
    (values.types as Record<string, unknown>[]).push({
      can_be_randomly_selected: '',
      [KEYED_MAP_ENTRY_KEY]: 'vanguardism',
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
    values.types = (values.types as Record<string, unknown>[]).filter(
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
    (values.types as Record<string, unknown>[])[0] = {
      can_be_randomly_selected: 'yes',
      [KEYED_MAP_ENTRY_KEY]: 'progressivism',
    };

    expect(computeIdeologyDeltas(snapshot, values)).toEqual([
      {
        added: [{ key: 'can_be_randomly_selected', value: 'yes' }],
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
