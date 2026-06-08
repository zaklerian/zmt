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
  currentRoot: null | string;
  onOpenFolder: () => void;
  onOpenPluginConfig: () => void;
}

export function AppHeader({
  currentRoot,
  onOpenFolder,
  onOpenPluginConfig,
}: AppHeaderProps) {
  const { t } = useTranslation(['app']);
  const openFolderLabel = t('actions.openFolder');
  const pluginConfigLabel = t('header.pluginConfig.label');

  return (
    <AppBar color="default" elevation={1} position="static">
      <Toolbar sx={{ gap: 2 }} variant="dense">
        <Typography sx={{ fontWeight: 500 }} variant="subtitle1">
          {t('header.title')}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {currentRoot !== null && (
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
        <Tooltip title={pluginConfigLabel}>
          <IconButton
            aria-label={pluginConfigLabel}
            size="small"
            onClick={onOpenPluginConfig}
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
