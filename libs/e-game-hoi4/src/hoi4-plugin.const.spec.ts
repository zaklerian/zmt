import { FEATURE_IDS } from '@contracts';
import { describe, expect, it } from 'vitest';

import { HOI4_PLUGIN } from './hoi4-plugin.const';

describe('HOI4_PLUGIN.features', () => {
  it('contributes the aircraft feature, enabled by default', () => {
    const aircraft = HOI4_PLUGIN.features.find(
      (feature) => feature.featureId === FEATURE_IDS.aircraft,
    );

    expect(aircraft).toBeDefined();
    expect(aircraft?.enabled).toBe(true);
    expect(aircraft?.label).toBe('Aircraft');
  });

  it('does not expose research as a feature flag', () => {
    const ids = HOI4_PLUGIN.features.map((feature) => feature.featureId);

    expect(ids).not.toContain('research');
  });
});
