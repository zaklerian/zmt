import { ProjectedSource } from '@contracts';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Box, Drawer, IconButton, Tooltip } from '@mui/material';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { appChromeActions } from './app-chrome-actions';
import { AppFooter } from './app-footer.component';
import { AppHeader } from './app-header.component';
import { PanelBreadcrumbs } from './panel-breadcrumbs.component';
import { PanelToolbar } from './panel-toolbar.component';

const DRAWER_WIDTH_OPEN = 320;
const DRAWER_WIDTH_MINI = 56;

interface AppLayoutProps {
  content: ReactNode;
  drawerOpen: boolean;
  hasSource: boolean;
  onOpenAppSettings: () => void;
  onOpenFolder: () => void;
  onToggleDrawer: () => void;
  panelToolbarRight?: ReactNode;
  selectedPath: null | string;
  sidebar: ReactNode;
  readonly sources: readonly ProjectedSource[];
}

export function AppLayout({
  content,
  drawerOpen,
  hasSource,
  onOpenAppSettings,
  onOpenFolder,
  onToggleDrawer,
  panelToolbarRight,
  selectedPath,
  sidebar,
  sources,
}: AppLayoutProps) {
  const { t } = useTranslation(['app']);
  const translate = t as (key: string) => string;
  const drawerContext = { open: drawerOpen, toggle: onToggleDrawer };
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
                title={translate(
                  appChromeActions.drawerToggle.label(drawerContext),
                )}
              >
                <IconButton
                  size="small"
                  onClick={() =>
                    appChromeActions.drawerToggle.execute(drawerContext)
                  }
                >
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
        <Box
          component="main"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            overflow: 'hidden',
          }}
        >
          {hasSource && (
            <PanelBreadcrumbs selectedPath={selectedPath} sources={sources} />
          )}
          {hasSource && panelToolbarRight != null && (
            <PanelToolbar right={panelToolbarRight} />
          )}
          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>{content}</Box>
        </Box>
      </Box>
      <AppFooter />
    </Box>
  );
}
