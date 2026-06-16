import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  AppBar,
  Box,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

import { appChromeActions } from './app-chrome-actions';

interface AppHeaderProps {
  hasSource: boolean;
  onOpenAppSettings: () => void;
  onOpenFolder: () => void;
}

export function AppHeader({
  hasSource,
  onOpenAppSettings,
  onOpenFolder,
}: AppHeaderProps) {
  const { t } = useTranslation(['app']);
  const translate = t as (key: string) => string;
  const addModContext = {
    hasSource,
    openFolder: onOpenFolder,
    present: hasSource,
  };
  const openSettingsContext = { openSettings: onOpenAppSettings };
  const addModLabel = translate(appChromeActions.addMod.label(addModContext));
  const appSettingsLabel = translate(
    appChromeActions.openSettings.label(openSettingsContext),
  );

  return (
    <AppBar color="default" elevation={1} position="static">
      <Toolbar sx={{ gap: 2 }} variant="dense">
        <Typography sx={{ fontWeight: 500 }} variant="subtitle1">
          {t('header.title')}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {appChromeActions.addMod.isAvailable(addModContext) && (
          <Tooltip title={addModLabel}>
            <IconButton
              aria-label={addModLabel}
              size="small"
              onClick={() =>
                void appChromeActions.addMod.execute(addModContext)
              }
            >
              <CreateNewFolderIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title={appSettingsLabel}>
          <IconButton
            aria-label={appSettingsLabel}
            size="small"
            onClick={() =>
              appChromeActions.openSettings.execute(openSettingsContext)
            }
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
