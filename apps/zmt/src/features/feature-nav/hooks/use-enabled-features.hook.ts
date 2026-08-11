import { FeatureContribution, Preferences } from '@contracts';
import { useCallback, useEffect, useState } from 'react';

const EMPTY_SETTINGS: Preferences['pluginSettings'] = {};

// Enabled features across all registered plugins: a feature is enabled when the
// user's stored per-game toggle says so, falling back to the plugin's declared
// default. Mirrors buildInitialFormValues in app-settings so the nav toggle and
// the settings switches agree on what "enabled" means.
export interface UseEnabledFeaturesResult {
  readonly features: readonly FeatureContribution[];
  readonly refetch: () => void;
}

export function useEnabledFeatures(): UseEnabledFeaturesResult {
  const [features, setFeatures] = useState<readonly FeatureContribution[]>([]);

  const refetch = useCallback(() => {
    let cancelled = false;

    Promise.all([
      window.api.plugins.list(),
      window.api.preferences.get('pluginSettings'),
    ])
      .then(([plugins, storedSettings]) => {
        if (cancelled) return;
        const settings = storedSettings ?? EMPTY_SETTINGS;
        const enabled = plugins.flatMap((plugin) => {
          const stored = settings[plugin.gameId]?.features ?? {};
          return plugin.features.filter(
            (feature) => stored[feature.featureId] ?? feature.enabled,
          );
        });
        setFeatures(enabled);
      })
      .catch(() => {
        if (cancelled) return;
        setFeatures([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => refetch(), [refetch]);

  return { features, refetch };
}
