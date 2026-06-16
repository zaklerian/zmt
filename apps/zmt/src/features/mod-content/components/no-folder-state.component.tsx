import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { appChromeActions } from '../../../app/layout/app-chrome-actions';

interface NoFolderStateProps {
  onOpenFolder: () => void;
}

export function NoFolderState({ onOpenFolder }: NoFolderStateProps) {
  const { t } = useTranslation(['feature.modContent', 'app']);
  const translate = t as (key: string) => string;
  const addModContext = {
    hasSource: false,
    openFolder: onOpenFolder,
    present: true,
  };
  return (
    <Box
      sx={{
        alignItems: 'center',
        display: 'flex',
        height: '100%',
        justifyContent: 'center',
        p: 4,
      }}
    >
      <Stack alignItems="center" spacing={2} sx={{ maxWidth: 420 }}>
        <Typography variant="h6">
          {t('feature.modContent:noFolderState.title')}
        </Typography>
        <Typography align="center" color="text.secondary" variant="body2">
          {t('feature.modContent:noFolderState.description')}
        </Typography>
        <Button
          startIcon={<FolderOpenIcon />}
          variant="contained"
          onClick={() => void appChromeActions.addMod.execute(addModContext)}
        >
          {translate(appChromeActions.addMod.label(addModContext))}
        </Button>
      </Stack>
    </Box>
  );
}
