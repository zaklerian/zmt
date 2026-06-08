import { Box, Button, Stack, Typography } from '@mui/material';
import { Component, ErrorInfo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[AppErrorBoundary]', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}

function ErrorFallback() {
  const { t } = useTranslation(['app']);
  const handleReload = () => {
    window.location.reload();
  };

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
          {t('errorBoundary.title')}
        </Typography>
        <Typography color="text.secondary" variant="body2">
          {t('errorBoundary.message')}
        </Typography>
        <Button variant="contained" onClick={handleReload}>
          {t('errorBoundary.reload')}
        </Button>
      </Stack>
    </Box>
  );
}
