import { Locale } from '../plugin';

export interface PluginFeatureSettings {
  readonly features: Readonly<Record<string, boolean>>;
  readonly gameFolderPath?: string;
}

export type PreferenceKey = keyof Preferences;

export interface Preferences {
  readonly hideUnsupportedFiles: boolean;
  readonly locale: Locale | null;
  readonly pluginSettings: Readonly<
    Partial<Record<string, PluginFeatureSettings>>
  >;
}

export const PREFERENCE_KEYS: readonly PreferenceKey[] = [
  'hideUnsupportedFiles',
  'locale',
  'pluginSettings',
];

export function isPreferenceKey(value: unknown): value is PreferenceKey {
  return (
    typeof value === 'string' &&
    (PREFERENCE_KEYS as readonly string[]).includes(value)
  );
}
