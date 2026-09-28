import { isFeatureEnabled } from './feature-toggle.util';

describe('isFeatureEnabled', () => {
  const aircraft = { enabled: true, featureId: 'aircraft', label: 'Aircraft' } as const;

  it('prefers the stored toggle over the plugin default', () => {
    expect(isFeatureEnabled({ aircraft: false }, aircraft)).toBe(false);
    expect(isFeatureEnabled({ traits: false }, aircraft)).toBe(true);
    expect(isFeatureEnabled({}, { ...aircraft, enabled: false })).toBe(false);
  });
});
