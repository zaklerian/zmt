import { Locale } from '../plugin';
import { WriteTargets } from '../write-target';

export interface PluginFeatureSettings {
  readonly features: Readonly<Record<string, boolean>>;
  readonly gameFolderPath?: string;
}

export type PreferenceKey = keyof Preferences;

export interface Preferences {
  readonly hideUnsupportedFiles: boolean;
  readonly hideVanilla: boolean;
  readonly locale: Locale | null;
  readonly pluginSettings: Readonly<
    Partial<Record<string, PluginFeatureSettings>>
  >;
  // The user's chosen save target per (mod, write-kind) — ADR 029 decision 4. A
  // keyed record inside one global key, which is the shape `pluginSettings` already
  // has: no new store, no new channel, and the `PreferenceKey` guard covers it by
  // the same list below.
  readonly writeTargets: WriteTargets;
}

export const PREFERENCE_KEYS: readonly PreferenceKey[] = [
  'hideUnsupportedFiles',
  'hideVanilla',
  'locale',
  'pluginSettings',
  'writeTargets',
];

export function isPreferenceKey(value: unknown): value is PreferenceKey {
  return (
    typeof value === 'string' &&
    (PREFERENCE_KEYS as readonly string[]).includes(value)
  );
}
