import { GamePlugin } from '@contracts';
import { describe, expect, it } from 'vitest';

import { buildInitialFormValues } from './use-plugin-config.hook';

const AIRCRAFT_PLUGIN = {
  displayName: 'Hearts of Iron IV',
  features: [{ enabled: true, featureId: 'aircraft', label: 'Aircraft' }],
  gameId: 'hoi4',
} as unknown as GamePlugin;

describe('buildInitialFormValues', () => {
  it('defaults the aircraft toggle to on when nothing is stored', () => {
    const values = buildInitialFormValues(AIRCRAFT_PLUGIN, {});

    expect(values.features.aircraft).toBe(true);
  });

  it('reflects a persisted disabled state across a reload', () => {
    const stored = { hoi4: { features: { aircraft: false } } };

    const values = buildInitialFormValues(AIRCRAFT_PLUGIN, stored);

    expect(values.features.aircraft).toBe(false);
  });
});
