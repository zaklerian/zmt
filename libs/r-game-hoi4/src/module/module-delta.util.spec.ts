import { describe, expect, it } from 'vitest';

import { computeModuleDeltas, ModuleBagSnapshot } from './module-delta.util';

const snapshot: ModuleBagSnapshot = {
  add_average_stats: [],
  add_stats: [{ key: 'air_attack', value: '4' }],
  multiply_stats: [
    { key: 'maximum_speed', value: '0.1' },
    { key: 'reliability', value: '0.05' },
  ],
  scalars: [{ key: 'sfx', value: 'sfx_engine' }],
};

describe('computeModuleDeltas', () => {
  it('emits exactly the block-scoped changes that moved', () => {
    const deltas = computeModuleDeltas(snapshot, {
      add_average_stats: [],
      add_stats: [
        { key: 'air_attack', value: '4' },
        { key: 'air_range', value: '100' },
      ],
      multiply_stats: [{ key: 'maximum_speed', value: '0.1' }],
      scalars: [{ key: 'sfx', value: 'sfx_jet' }],
    });

    expect(deltas).toEqual([
      {
        added: [],
        block: null,
        changed: [{ key: 'sfx', value: 'sfx_jet' }],
        removed: [],
      },
      {
        added: [{ key: 'air_range', value: '100' }],
        block: 'add_stats',
        changed: [],
        removed: [],
      },
      {
        added: [],
        block: 'multiply_stats',
        changed: [],
        removed: ['reliability'],
      },
    ]);
  });

  it('omits blocks with no change and trims keys before diffing', () => {
    const deltas = computeModuleDeltas(snapshot, {
      add_average_stats: [],
      add_stats: [{ key: '  air_attack  ', value: '4' }],
      multiply_stats: [
        { key: 'maximum_speed', value: '0.1' },
        { key: 'reliability', value: '0.05' },
      ],
      scalars: [{ key: 'sfx', value: 'sfx_engine' }],
    });

    expect(deltas).toEqual([]);
  });

  it('creates a previously-absent block on first add', () => {
    const deltas = computeModuleDeltas(snapshot, {
      add_average_stats: [{ key: 'air_agility', value: '2' }],
      add_stats: [{ key: 'air_attack', value: '4' }],
      multiply_stats: [
        { key: 'maximum_speed', value: '0.1' },
        { key: 'reliability', value: '0.05' },
      ],
      scalars: [{ key: 'sfx', value: 'sfx_engine' }],
    });

    expect(deltas).toEqual([
      {
        added: [{ key: 'air_agility', value: '2' }],
        block: 'add_average_stats',
        changed: [],
        removed: [],
      },
    ]);
  });
});
