import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Box, Drawer, IconButton, Tooltip } from '@mui/material';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { AppFooter } from './app-footer.component';
import { AppHeader } from './app-header.component';

const DRAWER_WIDTH_OPEN = 320;
const DRAWER_WIDTH_MINI = 56;

interface AppLayoutProps {
  content: ReactNode;
  drawerOpen: boolean;
  hasSource: boolean;
  onOpenAppSettings: () => void;
  onOpenFolder: () => void;
  onToggleDrawer: () => void;
  sidebar: ReactNode;
}

export function AppLayout({
  content,
  drawerOpen,
  hasSource,
  onOpenAppSettings,
  onOpenFolder,
  onToggleDrawer,
  sidebar,
}: AppLayoutProps) {
  const { t } = useTranslation(['app']);
  const width = drawerOpen ? DRAWER_WIDTH_OPEN : DRAWER_WIDTH_MINI;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppHeader
        hasSource={hasSource}
        onOpenAppSettings={onOpenAppSettings}
        onOpenFolder={onOpenFolder}
      />
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {hasSource && (
          <Drawer
            sx={{
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                overflowX: 'hidden',
                position: 'relative',
                transition: 'width 0.2s',
                width,
              },
              flexShrink: 0,
              width,
            }}
            variant="permanent"
          >
            <Box
              sx={{
                alignItems: 'center',
                display: 'flex',
                flexDirection: drawerOpen ? 'row' : 'column',
                gap: 0.5,
                justifyContent: drawerOpen ? 'flex-end' : 'center',
                p: 0.5,
              }}
            >
              <Tooltip
                placement="right"
                title={
                  drawerOpen
                    ? t('layout.drawer.collapse')
                    : t('layout.drawer.expand')
                }
              >
                <IconButton size="small" onClick={onToggleDrawer}>
                  {drawerOpen ? (
                    <ChevronLeftIcon fontSize="small" />
                  ) : (
                    <ChevronRightIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            </Box>
            {drawerOpen && (
              <Box sx={{ flexGrow: 1, overflow: 'auto', px: 1 }}>{sidebar}</Box>
            )}
          </Drawer>
        )}
        <Box component="main" sx={{ flexGrow: 1, overflow: 'auto' }}>
          {content}
        </Box>
      </Box>
      <AppFooter />
    </Box>
  );
}
