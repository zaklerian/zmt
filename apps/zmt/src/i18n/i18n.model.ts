export type { Locale, LocaleResources } from '@contracts';
export { LOCALES } from '@contracts';

export const HOST_NAMESPACES = [
  'app',
  'feature.appSettings',
  'feature.modContent',
  'feature.modInfoEdit',
] as const;

export type HostNamespace = (typeof HOST_NAMESPACES)[number];
