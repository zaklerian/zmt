import { GamePlugin, IpcError, isIpcError, Preferences } from '@contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { useAsyncCallback } from '../../../shared/hooks';
import { useModal } from '../../../shared/modal';
import {
  buildInitialFormValues,
  usePluginConfig,
} from '../hooks/use-plugin-config.hook';
import { PluginConfigFormValues } from '../plugin-config.model';
import { pluginConfigSchema } from '../plugin-config.schema';
import { pluginConfigService } from '../services/plugin-config.service';
import { PluginConfigForm } from './plugin-config-form.component';

interface PluginConfigModalContentProps {
  onClose: () => void;
}

interface PluginConfigModalProps {
  onClose: () => void;
  open: boolean;
}

interface PluginConfigReadyViewProps {
  onClose: () => void;
  plugins: readonly GamePlugin[];
  storedSettings: Preferences['pluginSettings'];
}

export function PluginConfigModal({ onClose, open }: PluginConfigModalProps) {
  if (!open) return null;
  return <PluginConfigModalContent onClose={onClose} />;
}

function PluginConfigModalContent({ onClose }: PluginConfigModalContentProps) {
  const { t } = useTranslation(['feature.pluginConfig', 'app']);
  const { status } = usePluginConfig();

  if (status.kind === 'loading') {
    return (
      <Dialog fullWidth maxWidth="sm" open onClose={onClose}>
        <DialogTitle>{t('feature.pluginConfig:modal.title')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (status.kind === 'error') {
    return (
      <Dialog fullWidth maxWidth="sm" open onClose={onClose}>
        <DialogTitle>{t('feature.pluginConfig:modal.title')}</DialogTitle>
        <DialogContent>
          <Alert severity="error">{status.error.message}</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('app:actions.close')}</Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (status.data.plugins.length === 0) {
    return (
      <Dialog fullWidth maxWidth="sm" open onClose={onClose}>
        <DialogTitle>{t('feature.pluginConfig:modal.title')}</DialogTitle>
        <DialogContent>
          <Alert severity="info">
            {t('feature.pluginConfig:modal.noPlugins')}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('app:actions.close')}</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <PluginConfigReadyView
      plugins={status.data.plugins}
      storedSettings={status.data.storedSettings}
      onClose={onClose}
    />
  );
}

function PluginConfigReadyView({
  onClose,
  plugins,
  storedSettings,
}: PluginConfigReadyViewProps) {
  const { t } = useTranslation(['feature.pluginConfig', 'app']);
  const modal = useModal();
  const initialPlugin = plugins[0];
  const defaultValues = useMemo(
    () => buildInitialFormValues(initialPlugin, storedSettings),
    [initialPlugin, storedSettings],
  );

  const methods = useForm<PluginConfigFormValues>({
    defaultValues,
    resolver: zodResolver(pluginConfigSchema),
  });

  const watchedGameId = useWatch({
    control: methods.control,
    defaultValue: defaultValues.activeGameId,
    name: 'activeGameId',
  });
  const activePlugin =
    plugins.find((p) => p.gameId === watchedGameId) ?? initialPlugin;

  const [saveError, setSaveError] = useState<IpcError | null>(null);

  const save = useAsyncCallback(async (values: PluginConfigFormValues) => {
    setSaveError(null);
    try {
      const current = (await pluginConfigService.getPluginSettings()) ?? {};
      const next = {
        ...current,
        [values.activeGameId]: { features: { ...values.features } },
      };
      await pluginConfigService.setPluginSettings(next);
      onClose();
    } catch (rawError: unknown) {
      const error: IpcError = isIpcError(rawError)
        ? rawError
        : { code: 500, message: String(rawError) };
      setSaveError(error);
    }
  });

  const requestClose = async () => {
    if (methods.formState.isDirty) {
      const proceed = await modal.confirm({
        confirmLabel: t('app:actions.discard'),
        message: t('feature.pluginConfig:close.unsavedMessage'),
        title: t('app:modals.unsavedChanges.title'),
      });
      if (!proceed) return;
    }
    onClose();
  };

  return (
    <Dialog fullWidth maxWidth="sm" open onClose={() => void requestClose()}>
      <DialogTitle>{t('feature.pluginConfig:modal.title')}</DialogTitle>
      <FormProvider {...methods}>
        <DialogContent>
          <PluginConfigForm
            activePlugin={activePlugin}
            plugins={plugins}
            storedSettings={storedSettings}
          />
          {saveError !== null && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {saveError.message}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={save.isPending} onClick={() => void requestClose()}>
            {t('app:actions.cancel')}
          </Button>
          <Button
            disabled={!methods.formState.isDirty || save.isPending}
            startIcon={
              save.isPending ? (
                <CircularProgress color="inherit" size={16} />
              ) : null
            }
            variant="contained"
            onClick={methods.handleSubmit(
              (values) => void save.execute(values),
            )}
          >
            {t('app:actions.save')}
          </Button>
        </DialogActions>
      </FormProvider>
    </Dialog>
  );
}
