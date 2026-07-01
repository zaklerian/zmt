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
import { modInfoEditActions } from '../mod-info-edit-actions';
import { modInfoEditService } from '../services/mod-info-edit.service';
import { ModInfoEditForm } from './mod-info-edit-form.component';

interface ModInfoEditPanelProps {
  readonly descriptorPath: string;
  readonly onCancel?: () => void;
}

// The mod-descriptor form driven by a concrete `.mod` path — reused by the
// mod-root route (above) and by the content panel when a `.mod` file is opened
// in form mode. `onCancel`, when present, closes the form (discarding unsaved
// edits after confirmation), matching the other forms' Cancel behavior.
export function ModInfoEditPanel({
  descriptorPath,
  onCancel,
}: ModInfoEditPanelProps) {
  const { t } = useTranslation(['feature.modInfoEdit', 'app']);
  const translate = t as (key: string) => string;
  const { astRef, originalSourceRef, reload, status } = useModDescriptor({
    descriptorPath,
  });
  const retryContext = { reload };

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
            <Button
              color="inherit"
              size="small"
              onClick={() => modInfoEditActions.retry.execute(retryContext)}
            >
              {translate(modInfoEditActions.retry.label(retryContext))}
            </Button>
          }
          severity="error"
        >
          {status.error.message}
        </Alert>
      </Box>
    );
  }

  const { defaultValues, parseErrors, plugin, schema } = status.data;

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
            onCancel={onCancel}
          />
        </Box>
      </Paper>
    </Box>
  );
}

// The mod-root route entry: resolves the active mod's `descriptor.mod` and
// renders the form inline (no Cancel — the route has no plain view to close to).
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

  return (
    <ModInfoEditPanel
      descriptorPath={modInfoEditService.descriptorPathForRoot(
        activeModRootPath,
      )}
    />
  );
}
