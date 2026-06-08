import { Locale } from './i18n.model';

interface ResolveLocaleArgs {
  browser: string;
  stored: null | string;
  supported: readonly Locale[];
}

export function resolveLocale(args: ResolveLocaleArgs): Locale {
  const { browser, stored, supported } = args;
  const supportedAsStrings = supported as readonly string[];

  if (stored !== null && supportedAsStrings.includes(stored)) {
    return stored as Locale;
  }

  const normalized = browser.split('-')[0]?.toLowerCase() ?? '';
  if (supportedAsStrings.includes(normalized)) {
    return normalized as Locale;
  }

  return 'en';
}
