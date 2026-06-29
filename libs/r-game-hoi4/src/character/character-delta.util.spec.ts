import { describe, expect, it } from 'vitest';

import {
  CharacterSnapshot,
  computeCharacterDeltas,
} from './character-delta.util';

const snapshot: CharacterSnapshot = {
  bags: [
    {
      binding: 'army',
      rows: [
        { key: 'large', value: '"gfx/large.dds"' },
        { key: 'small', value: '"gfx/small.dds"' },
      ],
      scope: ['portraits', 'army'],
    },
    {
      binding: 'corps_commander',
      rows: [{ key: 'skill', value: '4' }],
      scope: ['corps_commander'],
    },
  ],
  lists: [
    {
      binding: 'corps_commander__traits',
      scope: ['corps_commander', 'traits'],
      values: ['trait_one', 'trait_two'],
    },
  ],
  root: [{ key: 'name', value: '"OLD"' }],
  rootKeys: ['name'],
};

describe('computeCharacterDeltas', () => {
  it('emits a root scalar change at block null and a grandchild change at a two-element path', () => {
    const deltas = computeCharacterDeltas(snapshot, {
      army: [
        { key: 'large', value: '"gfx/new.dds"' },
        { key: 'small', value: '"gfx/small.dds"' },
      ],
      corps_commander: [{ key: 'skill', value: '4' }],
      corps_commander__traits: ['trait_one', 'trait_two'],
      name: '"NEW"',
    });

    expect(deltas).toEqual([
      {
        added: [],
        block: null,
        changed: [{ key: 'name', value: '"NEW"' }],
        removed: [],
      },
      {
        added: [],
        block: ['portraits', 'army'],
        changed: [{ key: 'large', value: '"gfx/new.dds"' }],
        removed: [],
      },
    ]);
  });

  it('lowers trait add and remove to bare value-list items (absent value, null) at the traits path', () => {
    const deltas = computeCharacterDeltas(snapshot, {
      army: [
        { key: 'large', value: '"gfx/large.dds"' },
        { key: 'small', value: '"gfx/small.dds"' },
      ],
      corps_commander: [{ key: 'skill', value: '4' }],
      corps_commander__traits: ['trait_two', 'trait_three'],
      name: '"OLD"',
    });

    expect(deltas).toEqual([
      {
        added: [{ key: 'trait_three', value: null }],
        block: ['corps_commander', 'traits'],
        changed: [],
        removed: ['trait_one'],
      },
    ]);
  });

  it('carries an instance-prefixed scope through to an indexed block segment', () => {
    const instanceSnapshot: CharacterSnapshot = {
      bags: [
        {
          binding: 'instance_1__country_leader',
          rows: [{ key: 'ideology', value: 'fascism' }],
          scope: [{ index: 1, name: 'instance' }, 'country_leader'],
        },
      ],
      lists: [],
      root: [],
      rootKeys: [],
    };

    const deltas = computeCharacterDeltas(instanceSnapshot, {
      instance_1__country_leader: [{ key: 'ideology', value: 'despotism' }],
    });

    expect(deltas).toEqual([
      {
        added: [],
        block: [{ index: 1, name: 'instance' }, 'country_leader'],
        changed: [{ key: 'ideology', value: 'despotism' }],
        removed: [],
      },
    ]);
  });

  it('omits unchanged surfaces and drops an emptied root scalar', () => {
    const deltas = computeCharacterDeltas(snapshot, {
      army: [
        { key: 'large', value: '"gfx/large.dds"' },
        { key: 'small', value: '"gfx/small.dds"' },
      ],
      corps_commander: [{ key: 'skill', value: '4' }],
      corps_commander__traits: ['trait_one', 'trait_two'],
      name: '',
    });

    expect(deltas).toEqual([
      { added: [], block: null, changed: [], removed: ['name'] },
    ]);
  });
});
