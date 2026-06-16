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
  root: [
    { key: 'name', value: '"OLD"' },
    { key: 'gender', value: 'male' },
  ],
  rootKeys: ['name', 'gender'],
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
      gender: 'female',
      name: '"OLD"',
    });

    expect(deltas).toEqual([
      {
        added: [],
        block: null,
        changed: [{ key: 'gender', value: 'female' }],
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

  it('lowers trait add and remove to bare value-list items (empty value) at the traits path', () => {
    const deltas = computeCharacterDeltas(snapshot, {
      army: [
        { key: 'large', value: '"gfx/large.dds"' },
        { key: 'small', value: '"gfx/small.dds"' },
      ],
      corps_commander: [{ key: 'skill', value: '4' }],
      corps_commander__traits: ['trait_two', 'trait_three'],
      gender: 'male',
      name: '"OLD"',
    });

    expect(deltas).toEqual([
      {
        added: [{ key: 'trait_three', value: '' }],
        block: ['corps_commander', 'traits'],
        changed: [],
        removed: ['trait_one'],
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
      gender: '',
      name: '"OLD"',
    });

    expect(deltas).toEqual([
      { added: [], block: null, changed: [], removed: ['gender'] },
    ]);
  });
});
