import { GameId, GamePlugin, Preferences } from '@contracts';
import {
  Box,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { useModal } from '../../../shared/modal';
import { buildInitialFormValues } from '../hooks/use-plugin-config.hook';
import { PluginConfigFormValues } from '../plugin-config.model';

interface PluginConfigFormProps {
  activePlugin: GamePlugin;
  plugins: readonly GamePlugin[];
  storedSettings: Preferences['pluginSettings'];
}

export function PluginConfigForm({
  activePlugin,
  plugins,
  storedSettings,
}: PluginConfigFormProps) {
  const { t } = useTranslation(['feature.pluginConfig', 'app']);
  const modal = useModal();
  const { control, formState, reset } =
    useFormContext<PluginConfigFormValues>();
  const gameLabel = t('feature.pluginConfig:form.game.label');

  const onlyOnePlugin = plugins.length <= 1;

  const requestGameChange = async (nextGameId: GameId) => {
    if (nextGameId === activePlugin.gameId) return;
    const nextPlugin = plugins.find((p) => p.gameId === nextGameId);
    if (nextPlugin === undefined) return;

    if (formState.isDirty) {
      const proceed = await modal.confirm({
        confirmLabel: t('app:actions.discard'),
        message: t('feature.pluginConfig:gameSwitch.unsavedMessage'),
        title: t('app:modals.unsavedChanges.title'),
      });
      if (!proceed) return;
    }
    reset(buildInitialFormValues(nextPlugin, storedSettings));
  };

  return (
    <Stack spacing={2} sx={{ pt: 1 }}>
      <Controller
        control={control}
        name="activeGameId"
        render={({ field }) => (
          <FormControl disabled={onlyOnePlugin} fullWidth size="small">
            <InputLabel id="plugin-config-game-label">{gameLabel}</InputLabel>
            <Select
              label={gameLabel}
              labelId="plugin-config-game-label"
              value={field.value}
              onChange={(event) => {
                void requestGameChange(event.target.value as GameId);
              }}
            >
              {plugins.map((plugin) => (
                <MenuItem key={plugin.gameId} value={plugin.gameId}>
                  {plugin.displayName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      />

      <Box>
        <Typography color="text.secondary" variant="overline">
          {t('feature.pluginConfig:form.features.sectionLabel')}
        </Typography>
        <Stack>
          {activePlugin.features.map((feature) => (
            <Controller
              key={feature.featureId}
              control={control}
              name={`features.${feature.featureId}`}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value === true}
                      onChange={(_, checked) => field.onChange(checked)}
                    />
                  }
                  label={feature.label}
                />
              )}
            />
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}
