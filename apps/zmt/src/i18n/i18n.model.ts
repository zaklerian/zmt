export type { Locale, LocaleResources } from '@contracts';
export { LOCALES } from '@contracts';

export const HOST_NAMESPACES = [
  'app',
  'feature.modContent',
  'feature.modInfoEdit',
  'feature.pluginConfig',
] as const;

export type HostNamespace = (typeof HOST_NAMESPACES)[number];
