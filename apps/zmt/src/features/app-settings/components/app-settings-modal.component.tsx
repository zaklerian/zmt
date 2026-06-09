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
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
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

interface AppSettingsModalContentProps {
  hideUnsupportedFiles: boolean;
  hideVanilla: boolean;
  onClose: () => void;
}

interface AppSettingsModalProps {
  hideUnsupportedFiles: boolean;
  hideVanilla: boolean;
  onClose: () => void;
  open: boolean;
}

interface AppSettingsReadyViewProps {
  hideUnsupportedFiles: boolean;
  hideVanilla: boolean;
  onClose: () => void;
  plugins: readonly GamePlugin[];
  storedSettings: Preferences['pluginSettings'];
}

export function AppSettingsModal({
  hideUnsupportedFiles,
  hideVanilla,
  onClose,
  open,
}: AppSettingsModalProps) {
  if (!open) return null;
  return (
    <AppSettingsModalContent
      hideUnsupportedFiles={hideUnsupportedFiles}
      hideVanilla={hideVanilla}
      onClose={onClose}
    />
  );
}

function AppSettingsModalContent({
  hideUnsupportedFiles,
  hideVanilla,
  onClose,
}: AppSettingsModalContentProps) {
  const { t } = useTranslation(['feature.appSettings', 'app']);
  const { status } = usePluginConfig();

  if (status.kind === 'loading') {
    return (
      <Dialog fullWidth maxWidth="sm" open onClose={onClose}>
        <DialogTitle>{t('feature.appSettings:modal.title')}</DialogTitle>
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
        <DialogTitle>{t('feature.appSettings:modal.title')}</DialogTitle>
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
        <DialogTitle>{t('feature.appSettings:modal.title')}</DialogTitle>
        <DialogContent>
          <Alert severity="info">
            {t('feature.appSettings:modal.noPlugins')}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('app:actions.close')}</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <AppSettingsReadyView
      hideUnsupportedFiles={hideUnsupportedFiles}
      hideVanilla={hideVanilla}
      plugins={status.data.plugins}
      storedSettings={status.data.storedSettings}
      onClose={onClose}
    />
  );
}

function AppSettingsReadyView({
  hideUnsupportedFiles,
  hideVanilla: hideVanillaProp,
  onClose,
  plugins,
  storedSettings,
}: AppSettingsReadyViewProps) {
  const { t } = useTranslation(['feature.appSettings', 'app']);
  const modal = useModal();
  const [hideUnsupported, setHideUnsupported] = useState(hideUnsupportedFiles);
  const [hideVanilla, setHideVanilla] = useState(hideVanillaProp);
  const initialPlugin = plugins[0];
  const storedGameFolderPath =
    storedSettings[initialPlugin.gameId]?.gameFolderPath ?? '';
  const [gameFolderPath, setGameFolderPath] = useState(storedGameFolderPath);
  const toggleChanged = hideUnsupported !== hideUnsupportedFiles;
  const hideVanillaChanged = hideVanilla !== hideVanillaProp;
  const gameFolderPathChanged = gameFolderPath !== storedGameFolderPath;
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
      const pluginFormDirty = methods.formState.isDirty;
      if (pluginFormDirty || gameFolderPathChanged) {
        const current = (await pluginConfigService.getPluginSettings()) ?? {};
        const stored = current[values.activeGameId];
        const features = pluginFormDirty
          ? { ...values.features }
          : (stored?.features ?? {});
        const resolvedGameFolderPath = gameFolderPathChanged
          ? gameFolderPath
          : stored?.gameFolderPath;
        const next = {
          ...current,
          [values.activeGameId]:
            resolvedGameFolderPath === undefined
              ? { features }
              : { features, gameFolderPath: resolvedGameFolderPath },
        };
        await pluginConfigService.setPluginSettings(next);
      }
      if (toggleChanged) {
        await window.api.preferences.set(
          'hideUnsupportedFiles',
          hideUnsupported,
        );
      }
      if (hideVanillaChanged) {
        await window.api.preferences.set('hideVanilla', hideVanilla);
      }
      onClose();
    } catch (rawError: unknown) {
      const error: IpcError = isIpcError(rawError)
        ? rawError
        : { code: 500, message: String(rawError) };
      setSaveError(error);
    }
  });

  const browse = useAsyncCallback(async () => {
    try {
      const picked = await window.api.fs.openFolderDialog();
      if (picked !== null) setGameFolderPath(picked);
    } catch (rawError: unknown) {
      const error: IpcError = isIpcError(rawError)
        ? rawError
        : { code: 500, message: String(rawError) };
      setSaveError(error);
    }
  });

  const requestClose = async () => {
    if (
      methods.formState.isDirty ||
      toggleChanged ||
      hideVanillaChanged ||
      gameFolderPathChanged
    ) {
      const proceed = await modal.confirm({
        confirmLabel: t('app:actions.discard'),
        message: t('feature.appSettings:close.unsavedMessage'),
        title: t('app:modals.unsavedChanges.title'),
      });
      if (!proceed) return;
    }
    onClose();
  };

  return (
    <Dialog fullWidth maxWidth="sm" open onClose={() => void requestClose()}>
      <DialogTitle>{t('feature.appSettings:modal.title')}</DialogTitle>
      <FormProvider {...methods}>
        <DialogContent>
          <PluginConfigForm
            activePlugin={activePlugin}
            plugins={plugins}
            storedSettings={storedSettings}
          />
          <Box sx={{ mt: 2 }}>
            <Stack alignItems="flex-end" direction="row" spacing={1}>
              <TextField
                fullWidth
                label={t('feature.appSettings:form.gameFolder.label')}
                size="small"
                slotProps={{ input: { readOnly: true } }}
                value={gameFolderPath}
              />
              <Button
                disabled={browse.isPending}
                variant="outlined"
                onClick={() => void browse.execute()}
              >
                {t('feature.appSettings:form.gameFolder.browse')}
              </Button>
            </Stack>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography color="text.secondary" variant="overline">
              {t('feature.appSettings:form.fileDisplay.sectionLabel')}
            </Typography>
            <Stack>
              <FormControlLabel
                control={
                  <Switch
                    checked={hideUnsupported}
                    onChange={(_, checked) => setHideUnsupported(checked)}
                  />
                }
                label={t(
                  'feature.appSettings:form.fileDisplay.hideUnsupported.label',
                )}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={hideVanilla}
                    onChange={(_, checked) => setHideVanilla(checked)}
                  />
                }
                label={t(
                  'feature.appSettings:form.fileDisplay.hideVanilla.label',
                )}
              />
            </Stack>
          </Box>
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
            disabled={
              (!methods.formState.isDirty &&
                !toggleChanged &&
                !hideVanillaChanged &&
                !gameFolderPathChanged) ||
              save.isPending
            }
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
