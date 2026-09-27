import type { Locale } from './locale.const';
import type { Messages } from './messages.model';

import { EN_MESSAGES } from './en.const';

export const LOCALE_LOADERS = {
  de: async () => (await import('./de.const')).DE_MESSAGES,
  en: () => Promise.resolve(EN_MESSAGES),
} satisfies Readonly<Record<Locale, () => Promise<Messages>>>;
