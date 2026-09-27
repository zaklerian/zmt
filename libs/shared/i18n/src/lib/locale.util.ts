import { LOCALE, type Locale } from './locale.const';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && Object.hasOwn(LOCALE, value);
}
