export const LOCALES = ['en', 'de', 'uk'] as const;

export type Locale = (typeof LOCALES)[number];

export type LocaleResources = Readonly<
  Record<Locale, Readonly<Record<string, Readonly<Record<string, unknown>>>>>
>;
