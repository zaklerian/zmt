import { createRequiredContext } from '../shared/react';
import { Locale } from './i18n.model';

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (next: Locale) => Promise<void>;
}

const { Provider, useValue } =
  createRequiredContext<LocaleContextValue>('useLocale');

export const LocaleContextProvider = Provider;
export const useLocale = useValue;
