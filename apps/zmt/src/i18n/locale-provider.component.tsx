import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { ReactNode, useEffect, useMemo, useState } from 'react';

import { KNOWN_RENDERER_PLUGINS } from '../plugins';
import { i18next, initI18n } from './i18n.config';
import { Locale, LOCALES } from './i18n.model';
import { en as enAppStrings } from './locales/en/app';
import { registerPluginNamespaces } from './register-plugin-namespaces';
import { resolveLocale } from './resolve-locale';
import { LocaleContextProvider, LocaleContextValue } from './use-locale.hook';

interface LocaleProviderProps {
  children: ReactNode;
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const [ready, setReady] = useState(false);
  const [bootFailed, setBootFailed] = useState(false);
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const stored = await window.api.preferences.get('locale');
      const initial = resolveLocale({
        browser: navigator.language,
        stored,
        supported: LOCALES,
      });
      await initI18n(initial);
      registerPluginNamespaces(KNOWN_RENDERER_PLUGINS);
      if (!cancelled) {
        setLocaleState(initial);
        setReady(true);
      }
    };

    boot().catch((error: unknown) => {
      console.error('[LocaleProvider] i18n boot failed', error);
      if (!cancelled) {
        setBootFailed(true);
      }
    });

    const handleLanguageChanged = (lng: string) => {
      if (cancelled) return;
      if ((LOCALES as readonly string[]).includes(lng)) {
        setLocaleState(lng as Locale);
      }
    };
    i18next.on('languageChanged', handleLanguageChanged);

    return () => {
      cancelled = true;
      i18next.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  const setLocale = async (next: Locale): Promise<void> => {
    const previous = i18next.language as Locale;
    await i18next.changeLanguage(next);
    try {
      await window.api.preferences.set('locale', next);
    } catch (error) {
      await i18next.changeLanguage(previous);
      throw error;
    }
  };

  const contextValue = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale }),
    [locale],
  );

  if (bootFailed) {
    // i18n is not ready on this path, so strings cannot flow through t().
    // Reuse the English errorBoundary copy as literals (the same shape the
    // AppErrorBoundary fallback renders once i18n is up).
    const strings = enAppStrings.errorBoundary;
    return (
      <Box
        sx={{
          alignItems: 'center',
          display: 'flex',
          height: '100vh',
          justifyContent: 'center',
          p: 3,
        }}
      >
        <Stack alignItems="center" maxWidth={480} spacing={2}>
          <Typography component="h1" variant="h5">
            {strings.title}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {strings.message}
          </Typography>
          <Button variant="contained" onClick={() => window.location.reload()}>
            {strings.reload}
          </Button>
        </Stack>
      </Box>
    );
  }

  if (!ready) {
    return (
      <Box
        sx={{
          alignItems: 'center',
          display: 'flex',
          height: '100vh',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocaleContextProvider value={contextValue}>
      {children}
    </LocaleContextProvider>
  );
}
