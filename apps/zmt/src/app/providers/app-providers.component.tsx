import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import { ReactNode } from 'react';

import { LocaleProvider } from '../../i18n';
import { ModalProvider } from '../../shared/modal';
import { AppErrorBoundary } from '../../shared/react';

const theme = createTheme();

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppErrorBoundary>
        <ModalProvider>
          <LocaleProvider>{children}</LocaleProvider>
        </ModalProvider>
      </AppErrorBoundary>
    </ThemeProvider>
  );
}
