import { RendererPlugin } from '@r-game-hoi4';

import { i18next } from './i18n.config';

export function registerPluginNamespaces(
  plugins: readonly RendererPlugin[],
): void {
  for (const plugin of plugins) {
    const resources = plugin.localeResources;
    if (resources === undefined) continue;

    for (const [locale, namespaces] of Object.entries(resources)) {
      for (const [ns, bundle] of Object.entries(namespaces)) {
        const existing = i18next.getResourceBundle(locale, ns) as
          | Record<string, unknown>
          | undefined;
        if (existing !== undefined && Object.keys(existing).length > 0) {
          console.warn(
            `[i18n] plugin '${plugin.gameId}' attempted to overwrite non-empty namespace '${ns}' for locale '${locale}'; skipping.`,
          );
          continue;
        }
        i18next.addResourceBundle(locale, ns, bundle, true, false);
      }
    }
  }
}
