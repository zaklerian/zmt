import type { LocaleResources } from '@contracts';

import { de } from './de/plugin.hoi4';
import { en } from './en/plugin.hoi4';
import { uk } from './uk/plugin.hoi4';

export const HOI4_LOCALE_RESOURCES = {
  de: { 'plugin.hoi4': de },
  en: { 'plugin.hoi4': en },
  uk: { 'plugin.hoi4': uk },
} satisfies LocaleResources;
