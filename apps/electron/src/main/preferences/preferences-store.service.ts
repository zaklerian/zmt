import { PreferenceKey, Preferences } from '@contracts';
import ElectronStore from 'electron-store';

type PreferencesShape = Partial<Preferences>;

let store: ElectronStore<PreferencesShape> | null = null;

export function resolveStoreName(): string {
  return process.env.ZMT_RENDERER_URL ? 'preferences.dev' : 'preferences';
}

function getStore(): ElectronStore<PreferencesShape> {
  if (store === null) {
    store = new ElectronStore<PreferencesShape>({
      migrations: {},
      name: resolveStoreName(),
    });
  }
  return store;
}

export const preferencesService = {
  async get<K extends PreferenceKey>(key: K): Promise<null | Preferences[K]> {
    const value = getStore().get(key);
    return value === undefined ? null : value;
  },
  async getAll(): Promise<Preferences> {
    const current = getStore().store;
    return {
      hideUnsupportedFiles: current.hideUnsupportedFiles ?? false,
      hideVanilla: current.hideVanilla ?? false,
      locale: current.locale ?? null,
      pluginSettings: current.pluginSettings ?? {},
      writeTargets: current.writeTargets ?? {},
    };
  },
  async set<K extends PreferenceKey>(
    key: K,
    value: null | Preferences[K],
  ): Promise<void> {
    if (value === null) {
      getStore().delete(key);
      return;
    }
    getStore().set(key, value);
  },
};
