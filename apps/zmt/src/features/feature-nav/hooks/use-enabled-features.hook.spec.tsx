import { GamePlugin } from '@contracts';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useEnabledFeatures } from './use-enabled-features.hook';

const AIRCRAFT_PLUGIN = {
  displayName: 'Hearts of Iron IV',
  features: [{ enabled: true, featureId: 'aircraft', label: 'Aircraft' }],
  gameId: 'hoi4',
} as unknown as GamePlugin;

function installApiMock(pluginSettings: unknown): void {
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: {
      plugins: { list: vi.fn().mockResolvedValue([AIRCRAFT_PLUGIN]) },
      preferences: { get: vi.fn().mockResolvedValue(pluginSettings) },
    },
    writable: true,
  });
}

describe('useEnabledFeatures', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('includes a feature that is on by default with no stored override', async () => {
    installApiMock(null);
    const { result } = renderHook(() => useEnabledFeatures());

    await waitFor(() => expect(result.current.features).toHaveLength(1));
    expect(result.current.features[0].featureId).toBe('aircraft');
  });

  it('excludes a feature the user has disabled in stored settings', async () => {
    installApiMock({ hoi4: { features: { aircraft: false } } });
    const { result } = renderHook(() => useEnabledFeatures());

    await waitFor(() => expect(result.current.features).toEqual([]));
  });
});
