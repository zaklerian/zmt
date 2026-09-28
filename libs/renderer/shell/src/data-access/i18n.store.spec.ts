import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { EN_MESSAGES, LOCALE, LOCALE_LOADERS, type Messages } from '@zmt/shared/i18n';

import { I18nStore } from './i18n.store';

describe('I18nStore', () => {
  let store: InstanceType<typeof I18nStore>;
  let deMessages: Messages;

  beforeAll(async () => {
    deMessages = await LOCALE_LOADERS.de();
  });

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(I18nStore);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts on the base locale with the base dictionary', () => {
    expect(store.locale()).toBe(LOCALE.en);
    expect(store.messages()).toBe(EN_MESSAGES);
    expect(store.status()).toEqual({ kind: 'idle' });
  });

  it('lazy-loads the German dictionary on first switch and exposes it', async () => {
    const loader = vi.spyOn(LOCALE_LOADERS, 'de');
    store.setLocale(LOCALE.de);
    expect(store.status()).toEqual({ kind: 'loading', locale: LOCALE.de });
    expect(store.locale()).toBe(LOCALE.en);

    await vi.waitFor(() => {
      expect(store.status()).toEqual({ kind: 'success' });
    });

    expect(loader).toHaveBeenCalledTimes(1);
    expect(store.locale()).toBe(LOCALE.de);
    expect(store.messages()).toBe(deMessages);
    expect(store.dictionaries().de).toBe(deMessages);
  });

  it('switches back to a cached dictionary without loading again', async () => {
    const loader = vi.spyOn(LOCALE_LOADERS, 'de');
    store.setLocale(LOCALE.de);
    await vi.waitFor(() => {
      expect(store.locale()).toBe(LOCALE.de);
    });

    store.setLocale(LOCALE.en);
    expect(store.locale()).toBe(LOCALE.en);
    expect(store.messages()).toBe(EN_MESSAGES);

    store.setLocale(LOCALE.de);
    expect(store.locale()).toBe(LOCALE.de);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('keeps the current locale and reports an error when loading fails', async () => {
    const failure = new Error('chunk failed');
    vi.spyOn(LOCALE_LOADERS, 'de').mockRejectedValue(failure);
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    store.setLocale(LOCALE.de);

    await vi.waitFor(() => {
      expect(store.status()).toEqual({ kind: 'error', locale: LOCALE.de });
    });
    expect(store.locale()).toBe(LOCALE.en);
    expect(store.messages()).toBe(EN_MESSAGES);
    expect(log).toHaveBeenCalledWith(failure);
  });

  it('mirrors the locale into the document language and title', async () => {
    const document = TestBed.inject(DOCUMENT);
    const title = TestBed.inject(Title);
    TestBed.tick();
    expect(document.documentElement.lang).toBe(LOCALE.en);
    expect(title.getTitle()).toBe(EN_MESSAGES.app.title);

    store.setLocale(LOCALE.de);
    await vi.waitFor(() => {
      expect(store.locale()).toBe(LOCALE.de);
    });
    TestBed.tick();
    expect(document.documentElement.lang).toBe(LOCALE.de);
    expect(title.getTitle()).toBe(deMessages.app.title);
  });

  it('falls back to the base dictionary when the active one is missing', () => {
    patchState(unprotected(store), { locale: LOCALE.de });
    expect(store.messages()).toBe(EN_MESSAGES);
  });

  it('keeps key and parameter parity between the loaded dictionaries', async () => {
    store.setLocale(LOCALE.de);
    await vi.waitFor(() => {
      expect(store.locale()).toBe(LOCALE.de);
    });
    const keys = (value: object): readonly string[] => Object.keys(value).sort();
    const { de, en } = store.dictionaries();
    expect(de).toBeDefined();
    expect(keys(de ?? {})).toEqual(keys(en));
    for (const section of keys(en)) {
      expect(keys(Reflect.get(de ?? {}, section) as object)).toEqual(
        keys(Reflect.get(en, section) as object),
      );
    }
    expect(de?.home.version('9')).toBe(en.home.version('9'));
  });
});
