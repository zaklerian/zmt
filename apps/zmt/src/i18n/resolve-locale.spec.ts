import { describe, expect, it } from 'vitest';

import { LOCALES } from './i18n.model';
import { resolveLocale } from './resolve-locale';

describe('resolveLocale', () => {
  it('returns the stored locale when it is supported', () => {
    expect(
      resolveLocale({ browser: 'en-US', stored: 'de', supported: LOCALES }),
    ).toBe('de');
  });

  it('falls back to browser when stored is null', () => {
    expect(
      resolveLocale({ browser: 'de-DE', stored: null, supported: LOCALES }),
    ).toBe('de');
  });

  it('normalizes browser language tags (de-DE → de, pt-BR → pt)', () => {
    expect(
      resolveLocale({ browser: 'uk-UA', stored: null, supported: LOCALES }),
    ).toBe('uk');
  });

  it('falls back to en when stored is an unsupported value (e.g. devtools wrote pl)', () => {
    expect(
      resolveLocale({ browser: 'en-US', stored: 'pl', supported: LOCALES }),
    ).toBe('en');
  });

  it('falls back to en when stored is unsupported and browser is also unsupported', () => {
    expect(
      resolveLocale({ browser: 'pt-BR', stored: 'pl', supported: LOCALES }),
    ).toBe('en');
  });

  it('falls back to en when neither stored nor browser match', () => {
    expect(
      resolveLocale({ browser: 'fr-FR', stored: null, supported: LOCALES }),
    ).toBe('en');
  });

  it('falls back to en when browser is an empty string', () => {
    expect(
      resolveLocale({ browser: '', stored: null, supported: LOCALES }),
    ).toBe('en');
  });

  it('prefers stored over browser when both are supported', () => {
    expect(
      resolveLocale({ browser: 'de-DE', stored: 'uk', supported: LOCALES }),
    ).toBe('uk');
  });

  it('handles browser tags with no region (just "de")', () => {
    expect(
      resolveLocale({ browser: 'de', stored: null, supported: LOCALES }),
    ).toBe('de');
  });
});
