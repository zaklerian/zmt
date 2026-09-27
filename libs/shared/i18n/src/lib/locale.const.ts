export const LOCALE = {
  de: 'de',
  en: 'en',
} as const;

export type Locale = keyof typeof LOCALE;

export const DEFAULT_LOCALE: Locale = LOCALE.en;

export const LOCALES: readonly Locale[] = [LOCALE.en, LOCALE.de];
