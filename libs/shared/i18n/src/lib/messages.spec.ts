import { DE_MESSAGES } from './de.const';
import { EN_MESSAGES } from './en.const';
import { LOCALE_LOADERS } from './locale-loader.const';
import { DEFAULT_LOCALE, LOCALE, LOCALES } from './locale.const';
import { isLocale } from './locale.util';

type Shape = string | { readonly [key: string]: Shape };

function shapeOf(value: unknown): Shape {
  if (typeof value === 'function') {
    return `function/${String(value.length)}`;
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, shapeOf(entry)]),
    );
  }
  return typeof value;
}

describe('dictionaries', () => {
  it('keeps every locale in key and parameter parity with the base', () => {
    expect(shapeOf(DE_MESSAGES)).toEqual(shapeOf(EN_MESSAGES));
  });

  it('formats parameterised messages per locale', () => {
    expect(EN_MESSAGES.home.version('1.2.3')).toBe('Version 1.2.3');
    expect(DE_MESSAGES.home.version('1.2.3')).toBe('Version 1.2.3');
  });

  it('translates user-facing strings in the German dictionary', () => {
    expect(DE_MESSAGES.home.welcome).not.toBe(EN_MESSAGES.home.welcome);
    expect(DE_MESSAGES.app.title).not.toBe(EN_MESSAGES.app.title);
  });
});

describe('locales', () => {
  it('lists the base locale first and every locale once', () => {
    expect(LOCALES).toEqual([LOCALE.en, LOCALE.de]);
    expect(DEFAULT_LOCALE).toBe(LOCALE.en);
  });

  it('recognises only declared locales', () => {
    expect(isLocale('de')).toBe(true);
    expect(isLocale('en')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale('toString')).toBe(false);
    expect(isLocale(1)).toBe(false);
    expect(isLocale(null)).toBe(false);
  });

  it('loads each locale dictionary through its loader', async () => {
    await expect(LOCALE_LOADERS.en()).resolves.toBe(EN_MESSAGES);
    await expect(LOCALE_LOADERS.de()).resolves.toBe(DE_MESSAGES);
  });
});
