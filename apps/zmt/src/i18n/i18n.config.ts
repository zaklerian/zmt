import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import { HOST_NAMESPACES, Locale } from './i18n.model';
import { RESOURCES } from './resources';

export async function initI18n(initialLocale: Locale): Promise<void> {
  if (i18next.isInitialized) return;

  await i18next.use(initReactI18next).init({
    defaultNS: 'app',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    lng: initialLocale,
    missingKeyHandler: (lngs, ns, key) => {
      if (import.meta.env.DEV) {
        console.warn(
          `[i18n] missing key '${ns}:${key}' for ${lngs.join(', ')}`,
        );
      }
    },
    ns: [...HOST_NAMESPACES],
    resources: RESOURCES,
    returnNull: false,
    saveMissing: import.meta.env.DEV,
  });
}

export { default as i18next } from 'i18next';
