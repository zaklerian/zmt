import { GAME_IDS } from '@contracts';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

import { useShell } from '../../../app/shell/shell-context';
import { useRendererPlugin } from '../../../plugins';
import { useModDescriptor } from '../hooks';
import { ModInfoEditForm } from './mod-info-edit-form.component';

interface ModInfoEditLoadedProps {
  readonly modRootPath: string;
}

export function ModInfoEditView() {
  const { t } = useTranslation(['feature.modInfoEdit', 'app']);
  const { activeModRootPath } = useShell();
  const rendererPlugin = useRendererPlugin(GAME_IDS.hoi4);

  if (activeModRootPath === null) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary" variant="body2">
          {t('app:emptyStates.selectModRoot')}
        </Typography>
      </Box>
    );
  }

  if (rendererPlugin === null) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {t('feature.modInfoEdit:view.noPluginError')}
        </Alert>
      </Box>
    );
  }

  return <ModInfoEditLoaded modRootPath={activeModRootPath} />;
}

function ModInfoEditLoaded({ modRootPath }: ModInfoEditLoadedProps) {
  const { t } = useTranslation(['feature.modInfoEdit', 'app']);
  const { astRef, originalSourceRef, reload, status } = useModDescriptor({
    modRootPath,
  });

  if (status.kind === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (status.kind === 'error') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          action={
            <Button color="inherit" size="small" onClick={reload}>
              {t('app:actions.retry')}
            </Button>
          }
          severity="error"
        >
          {status.error.message}
        </Alert>
      </Box>
    );
  }

  const { defaultValues, descriptorPath, parseErrors, plugin, schema } =
    status.data;

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography gutterBottom variant="h6">
          {t('feature.modInfoEdit:view.title')}
        </Typography>
        <Typography color="text.secondary" variant="caption">
          {descriptorPath}
        </Typography>
        <Box sx={{ mt: 3 }}>
          <ModInfoEditForm
            astRef={astRef}
            defaultValues={defaultValues}
            descriptorPath={descriptorPath}
            originalSourceRef={originalSourceRef}
            parseErrors={parseErrors}
            plugin={plugin}
            schema={schema}
          />
        </Box>
      </Paper>
    </Box>
  );
}
