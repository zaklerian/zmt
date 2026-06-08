import { GamePlugin, Preferences } from '@contracts';

export const pluginConfigService = {
  getPluginSettings(): Promise<null | Preferences['pluginSettings']> {
    return window.api.preferences.get('pluginSettings');
  },
  listPlugins(): Promise<readonly GamePlugin[]> {
    return window.api.plugins.list();
  },
  setPluginSettings(value: Preferences['pluginSettings']): Promise<void> {
    return window.api.preferences.set('pluginSettings', value);
  },
};
