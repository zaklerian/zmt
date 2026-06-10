import { EquipmentScalar } from '@contracts';
import { describe, expect, it } from 'vitest';

import { computeScalarDelta } from './equipment-delta.util';

const snapshot: readonly EquipmentScalar[] = [
  { key: 'air_attack', value: '10' },
  { key: 'air_range', value: '2000' },
  { key: 'reliability', value: '0.8' },
];

describe('computeScalarDelta', () => {
  it('reports an added key, a changed value, and a removed key', () => {
    const delta = computeScalarDelta(snapshot, [
      { key: 'air_attack', value: '12' },
      { key: 'air_range', value: '2000' },
      { key: 'maximum_speed', value: '500' },
    ]);

    expect(delta.added).toEqual([{ key: 'maximum_speed', value: '500' }]);
    expect(delta.changed).toEqual([{ key: 'air_attack', value: '12' }]);
    expect(delta.removed).toEqual(['reliability']);
  });

  it('returns empty groups when nothing changed', () => {
    const delta = computeScalarDelta(
      snapshot,
      snapshot.map((scalar) => ({ ...scalar })),
    );

    expect(delta.added).toEqual([]);
    expect(delta.changed).toEqual([]);
    expect(delta.removed).toEqual([]);
  });
});
