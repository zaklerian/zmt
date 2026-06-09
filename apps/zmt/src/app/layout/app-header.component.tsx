import FolderOpenIcon from '@mui/icons-material/FolderOpen';
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
  const openFolderLabel = t('actions.openFolder');
  const appSettingsLabel = t('header.appSettings.label');

  return (
    <AppBar color="default" elevation={1} position="static">
      <Toolbar sx={{ gap: 2 }} variant="dense">
        <Typography sx={{ fontWeight: 500 }} variant="subtitle1">
          {t('header.title')}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {hasSource && (
          <Tooltip title={openFolderLabel}>
            <IconButton
              aria-label={openFolderLabel}
              size="small"
              onClick={onOpenFolder}
            >
              <FolderOpenIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title={appSettingsLabel}>
          <IconButton
            aria-label={appSettingsLabel}
            size="small"
            onClick={onOpenAppSettings}
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
