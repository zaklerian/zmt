import {
  AppApiModel,
  EntityField,
  IPC_ERROR_CODES,
  IpcError,
  isIpcError,
  ModuleEntity,
} from '@contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { ModalService } from '@r-core';
import { useCallback, useMemo, useState } from 'react';
import { Control, FieldValues, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { ScalarBag } from '../scalar-bag';
import {
  KNOWN_MODULE_KEYS,
  KNOWN_MODULE_STAT_KEYS,
} from './known-module-keys.const';
import { computeModuleDeltas, ModuleBagSnapshot } from './module-delta.util';
import {
  buildModuleEditSchema,
  ModuleEditFormValues,
} from './module-edit.schema';
import { moduleErrorMessageKey } from './module-error.util';

interface ModuleEditFormProps {
  readonly entity: ModuleEntity;
  readonly modal: ModalService;
  readonly modId: string;
  readonly onClose: () => void;
  readonly onSaved: () => void;
  readonly relativePath: string;
}

const toRow = (field: EntityField): { key: string; value: string } => ({
  key: field.key,
  value: field.value,
});

export function ModuleEditForm({
  entity,
  modal,
  modId,
  onClose,
  onSaved,
  relativePath,
}: ModuleEditFormProps) {
  // plugin.hoi4 keys are runtime-registered and not in the app's typed resource
  // map; cast t() to the loose key signature as the recognizer surfaces do.
  const { t } = useTranslation();
  const translate = useCallback(
    (key: string): string => (t as (key: string) => string)(key),
    [t],
  );
  const schema = useMemo(() => buildModuleEditSchema(translate), [translate]);

  const { category, domain, name, scalars, statBlocks } = entity;

  // Snapshot each bag's seeded key→value set at open so save diffs against the
  // original projection rather than the (mutated) field arrays.
  const snapshot = useMemo<ModuleBagSnapshot>(
    () => ({
      add_average_stats: statBlocks.add_average_stats,
      add_stats: statBlocks.add_stats,
      multiply_stats: statBlocks.multiply_stats,
      scalars,
    }),
    [scalars, statBlocks],
  );

  const { control, formState, handleSubmit } = useForm<ModuleEditFormValues>({
    defaultValues: {
      add_average_stats: snapshot.add_average_stats.map(toRow),
      add_stats: snapshot.add_stats.map(toRow),
      multiply_stats: snapshot.multiply_stats.map(toRow),
      scalars: snapshot.scalars.map(toRow),
    },
    mode: 'onChange',
    resolver: zodResolver(schema),
  });
  const [pending, setPending] = useState(false);

  const surfaceError = async (rawError: unknown): Promise<void> => {
    const error: IpcError = isIpcError(rawError)
      ? rawError
      : { code: IPC_ERROR_CODES.INTERNAL, message: String(rawError) };
    await modal.info({
      message: translate(moduleErrorMessageKey(error.code)),
      title: translate('plugin.hoi4:module.errors.title'),
    });
  };

  const save = async (values: ModuleEditFormValues): Promise<void> => {
    setPending(true);
    try {
      const deltas = computeModuleDeltas(snapshot, values);
      const { api } = window as unknown as { readonly api: AppApiModel };
      await api.entity.write({
        deltas,
        entityName: name,
        modId,
        relativePath,
      });
      onClose();
      onSaved();
    } catch (rawError: unknown) {
      await surfaceError(rawError);
    } finally {
      setPending(false);
    }
  };

  const requestClose = async (): Promise<void> => {
    if (formState.isDirty) {
      const proceed = await modal.confirm({
        confirmLabel: translate('plugin.hoi4:module.form.discard'),
        message: translate('plugin.hoi4:module.form.unsavedMessage'),
        title: translate('plugin.hoi4:module.form.unsavedTitle'),
      });
      if (!proceed) return;
    }
    onClose();
  };

  // Field-level chrome is identical across every bag; resolve once and share.
  const bagControl = control as unknown as Control<FieldValues>;
  const addLabel = translate('plugin.hoi4:module.form.addField');
  const keyLabel = translate('plugin.hoi4:module.form.fields.key.label');
  const removeLabel = translate('plugin.hoi4:module.form.removeField');
  const valueLabel = translate('plugin.hoi4:module.form.fields.value.label');

  return (
    <Dialog fullWidth maxWidth="md" open onClose={() => void requestClose()}>
      <DialogTitle>
        <Stack alignItems="baseline" direction="row" spacing={1}>
          <Typography variant="h6">{name}</Typography>
          <Typography color="text.secondary" variant="body2">
            {`${translate('plugin.hoi4:module.form.header.category')}: ${
              category === '' ? '—' : category
            }`}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {`${translate('plugin.hoi4:module.form.header.domain')}: ${translate(
              `plugin.hoi4:module.domain.${domain}`,
            )}`}
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <ScalarBag
            addLabel={addLabel}
            control={bagControl}
            keyLabel={keyLabel}
            keySuggestions={KNOWN_MODULE_KEYS}
            name="scalars"
            removeLabel={removeLabel}
            sectionLabel={translate('plugin.hoi4:module.form.sections.scalars')}
            valueLabel={valueLabel}
          />
          <ScalarBag
            addLabel={addLabel}
            control={bagControl}
            keyLabel={keyLabel}
            keySuggestions={KNOWN_MODULE_STAT_KEYS}
            name="add_stats"
            removeLabel={removeLabel}
            sectionLabel={translate(
              'plugin.hoi4:module.form.sections.addStats',
            )}
            valueLabel={valueLabel}
          />
          <ScalarBag
            addLabel={addLabel}
            control={bagControl}
            keyLabel={keyLabel}
            keySuggestions={KNOWN_MODULE_STAT_KEYS}
            name="multiply_stats"
            removeLabel={removeLabel}
            sectionLabel={translate(
              'plugin.hoi4:module.form.sections.multiplyStats',
            )}
            valueLabel={valueLabel}
          />
          <ScalarBag
            addLabel={addLabel}
            control={bagControl}
            keyLabel={keyLabel}
            keySuggestions={KNOWN_MODULE_STAT_KEYS}
            name="add_average_stats"
            removeLabel={removeLabel}
            sectionLabel={translate(
              'plugin.hoi4:module.form.sections.addAverageStats',
            )}
            valueLabel={valueLabel}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={pending} onClick={() => void requestClose()}>
          {translate('plugin.hoi4:module.form.cancel')}
        </Button>
        <Button
          disabled={!formState.isDirty || !formState.isValid || pending}
          startIcon={
            pending ? <CircularProgress color="inherit" size={16} /> : null
          }
          variant="contained"
          onClick={handleSubmit((values) => void save(values))}
        >
          {translate('plugin.hoi4:module.form.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
