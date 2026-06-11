import { EntityField } from '@contracts';
import { describe, expect, it } from 'vitest';

import { buildDefaultModulesDelta } from './slot-delta.util';

const snapshot: readonly EntityField[] = [
  { key: 'engine_slot', value: 'engine_2' },
  { key: 'gun_slot', value: 'lmg_weapon_1' },
];

describe('buildDefaultModulesDelta', () => {
  it('emits add, change, and remove ops scoped to default_modules', () => {
    const delta = buildDefaultModulesDelta(snapshot, {
      bomb_slot: 'bomb_locks_1',
      engine_slot: 'engine_3',
      gun_slot: '',
    });

    expect(delta).toEqual({
      added: [{ key: 'bomb_slot', value: 'bomb_locks_1' }],
      block: 'default_modules',
      changed: [{ key: 'engine_slot', value: 'engine_3' }],
      removed: ['gun_slot'],
    });
  });

  it('emits an empty delta when nothing moved', () => {
    const delta = buildDefaultModulesDelta(snapshot, {
      engine_slot: 'engine_2',
      gun_slot: 'lmg_weapon_1',
    });

    expect(delta).toEqual({
      added: [],
      block: 'default_modules',
      changed: [],
      removed: [],
    });
  });

  it('treats a cleared-only edit as a removal', () => {
    const delta = buildDefaultModulesDelta(snapshot, {
      engine_slot: 'engine_2',
      gun_slot: '',
    });

    expect(delta).toEqual({
      added: [],
      block: 'default_modules',
      changed: [],
      removed: ['gun_slot'],
    });
  });
});
