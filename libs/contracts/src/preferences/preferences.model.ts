import { Locale } from '../plugin';

export interface PluginFeatureSettings {
  readonly features: Readonly<Record<string, boolean>>;
}

export type PreferenceKey = keyof Preferences;

export interface Preferences {
  readonly lastOpenedFolder: null | string;
  readonly locale: Locale | null;
  readonly pluginSettings: Readonly<
    Partial<Record<string, PluginFeatureSettings>>
  >;
}

export const PREFERENCE_KEYS: readonly PreferenceKey[] = [
  'lastOpenedFolder',
  'locale',
  'pluginSettings',
];

export function isPreferenceKey(value: unknown): value is PreferenceKey {
  return (
    typeof value === 'string' &&
    (PREFERENCE_KEYS as readonly string[]).includes(value)
  );
}
