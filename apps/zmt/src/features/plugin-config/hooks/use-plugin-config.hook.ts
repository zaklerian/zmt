import { GamePlugin, IpcError, isIpcError, Preferences } from '@contracts';
import { useEffect, useState } from 'react';

import { PluginConfigFormValues } from '../plugin-config.model';
import { pluginConfigService } from '../services/plugin-config.service';

export interface UsePluginConfigResult {
  readonly status: Status;
}

interface LoadedData {
  readonly plugins: readonly GamePlugin[];
  readonly storedSettings: Preferences['pluginSettings'];
}

type Status =
  | { readonly data: LoadedData; readonly kind: 'ready' }
  | { readonly error: IpcError; readonly kind: 'error' }
  | { readonly kind: 'loading' };

const EMPTY_SETTINGS: Preferences['pluginSettings'] = {};

export function buildInitialFormValues(
  plugin: GamePlugin,
  storedSettings: Preferences['pluginSettings'],
): PluginConfigFormValues {
  const stored = storedSettings[plugin.gameId]?.features ?? {};
  const features = Object.fromEntries(
    plugin.features.map((f) => [f.featureId, stored[f.featureId] ?? f.enabled]),
  );
  return { activeGameId: plugin.gameId, features };
}

export function usePluginConfig(): UsePluginConfigResult {
  const [status, setStatus] = useState<Status>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      pluginConfigService.listPlugins(),
      pluginConfigService.getPluginSettings(),
    ])
      .then(([plugins, storedSettings]) => {
        if (cancelled) return;
        setStatus({
          data: {
            plugins,
            storedSettings: storedSettings ?? EMPTY_SETTINGS,
          },
          kind: 'ready',
        });
      })
      .catch((rawError: unknown) => {
        if (cancelled) return;
        const error: IpcError = isIpcError(rawError)
          ? rawError
          : { code: 500, message: String(rawError) };
        setStatus({ error, kind: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { status };
}
