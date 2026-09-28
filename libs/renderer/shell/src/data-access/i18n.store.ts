import { DOCUMENT } from '@angular/common';
import { computed, effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  DEFAULT_LOCALE,
  EN_MESSAGES,
  type Locale,
  LOCALE_LOADERS,
  type Messages,
} from '@zmt/shared/i18n';
import { catchError, EMPTY, from, of, pipe, switchMap, tap } from 'rxjs';

export type LocaleStatus =
  | { readonly kind: 'error'; readonly locale: Locale }
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading'; readonly locale: Locale }
  | { readonly kind: 'success' };

export type LoadedDictionaries = Readonly<Partial<Record<Locale, Messages>>> & {
  readonly en: Messages;
};

export interface I18nState {
  readonly dictionaries: LoadedDictionaries;
  readonly locale: Locale;
  readonly status: LocaleStatus;
}

const INITIAL_STATE: I18nState = {
  dictionaries: { en: EN_MESSAGES },
  locale: DEFAULT_LOCALE,
  status: { kind: 'idle' },
};

export const I18nStore = signalStore(
  { providedIn: 'root' },
  withState(INITIAL_STATE),
  withComputed(({ dictionaries, locale }) => ({
    messages: computed<Messages>(() => dictionaries()[locale()] ?? dictionaries().en),
  })),
  withMethods((store) => ({
    setLocale: rxMethod<Locale>(
      pipe(
        switchMap((locale) => {
          const cached = store.dictionaries()[locale];
          if (cached) {
            return of({ locale, messages: cached });
          }
          patchState(store, { status: { kind: 'loading', locale } });
          return from(LOCALE_LOADERS[locale]()).pipe(
            switchMap((messages) => of({ locale, messages })),
            catchError((error: unknown) => {
              console.error(error);
              patchState(store, { status: { kind: 'error', locale } });
              return EMPTY;
            }),
          );
        }),
        tap(({ locale, messages }) => {
          patchState(store, (state): Partial<I18nState> => ({
            dictionaries: { ...state.dictionaries, [locale]: messages },
            locale,
            status: { kind: 'success' },
          }));
        }),
      ),
    ),
  })),
  withHooks({
    onInit(store) {
      const document = inject(DOCUMENT);
      const title = inject(Title);
      effect(() => {
        document.documentElement.lang = store.locale();
        title.setTitle(store.messages().app.title);
      });
    },
  }),
);
