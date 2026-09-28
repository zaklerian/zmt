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
    expect(EN_MESSAGES.modInfo.parserWarnings(2)).toBe('Parser warnings (2)');
    expect(DE_MESSAGES.modInfo.parserOffset(3, 9)).toBe('Offset 3–9');
    expect(EN_MESSAGES.techTree.deleteTitle('fighter1')).toBe('Delete fighter1?');
    expect(DE_MESSAGES.techTree.deleteConfirmTree(4)).toBe('Baum löschen (4)');
  });

  it('renders every parameterised message of every locale to a non-empty string', () => {
    const isMessage = (value: unknown): value is (...args: never) => unknown =>
      typeof value === 'function';
    const functions = (value: unknown): readonly ((...args: never) => unknown)[] => {
      if (isMessage(value)) {
        return [value];
      }
      if (typeof value === 'object' && value !== null) {
        return Object.values(value).flatMap(functions);
      }
      return [];
    };
    for (const dictionary of [EN_MESSAGES, DE_MESSAGES]) {
      const messages = functions(dictionary);
      expect(messages.length).toBeGreaterThan(0);
      for (const message of messages) {
        const rendered: unknown = Reflect.apply(message, undefined, [7, 12]);
        expect(typeof rendered).toBe('string');
        expect(rendered).not.toBe('');
      }
    }
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
