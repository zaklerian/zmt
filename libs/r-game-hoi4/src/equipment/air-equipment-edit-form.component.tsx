import {
  AppApiModel,
  EquipmentEntity,
  IPC_ERROR_CODES,
  IpcError,
  isIpcError,
} from '@contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ModalService } from '@r-core';
import { useCallback, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import {
  AirEquipmentFormValues,
  buildAirEquipmentSchema,
} from './air-equipment-edit.schema';
import { computeScalarDelta } from './equipment-delta.util';
import { equipmentErrorMessageKey } from './equipment-error.util';
import { KNOWN_AIR_EQUIPMENT_KEYS } from './known-air-equipment-keys.const';

interface AirEquipmentEditFormProps {
  readonly entity: EquipmentEntity;
  readonly modal: ModalService;
  readonly modId: string;
  readonly onClose: () => void;
  readonly onSaved: () => void;
  readonly relativePath: string;
}

export function AirEquipmentEditForm({
  entity,
  modal,
  modId,
  onClose,
  onSaved,
  relativePath,
}: AirEquipmentEditFormProps) {
  // plugin.hoi4 keys are runtime-registered and not in the app's typed resource
  // map; cast t() to the loose key signature as the recognizer surfaces do.
  const { t } = useTranslation();
  const translate = useCallback(
    (key: string): string => (t as (key: string) => string)(key),
    [t],
  );
  const schema = useMemo(() => buildAirEquipmentSchema(translate), [translate]);

  // Snapshot the seeded scalars at open so save can diff against the original
  // key→value set rather than re-reading the (mutated) field array.
  const snapshot = entity.scalars;
  const { classification, kind, name } = entity;
  const typeTokens =
    classification.status === 'classified' ? classification.type : [];
  const domainLabel =
    classification.status === 'classified'
      ? translate(`plugin.hoi4:equipment.domain.${classification.domain}`)
      : '';

  const { control, formState, handleSubmit } = useForm<AirEquipmentFormValues>({
    defaultValues: {
      rows: snapshot.map((scalar) => ({
        key: scalar.key,
        value: scalar.value,
      })),
    },
    mode: 'onChange',
    resolver: zodResolver(schema),
  });
  const { append, fields, remove } = useFieldArray({ control, name: 'rows' });
  const [pending, setPending] = useState(false);

  const surfaceError = async (rawError: unknown): Promise<void> => {
    const error: IpcError = isIpcError(rawError)
      ? rawError
      : { code: IPC_ERROR_CODES.INTERNAL, message: String(rawError) };
    await modal.info({
      message: translate(equipmentErrorMessageKey(error.code)),
      title: translate('plugin.hoi4:equipment.errors.title'),
    });
  };

  const save = async (values: AirEquipmentFormValues): Promise<void> => {
    setPending(true);
    try {
      const rows = values.rows.map((row) => ({
        key: row.key.trim(),
        value: row.value,
      }));
      const delta = computeScalarDelta(snapshot, rows);
      const { api } = window as unknown as { readonly api: AppApiModel };
      await api.entity.write({
        deltas: [{ block: null, ...delta }],
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
        confirmLabel: translate('plugin.hoi4:equipment.form.discard'),
        message: translate('plugin.hoi4:equipment.form.unsavedMessage'),
        title: translate('plugin.hoi4:equipment.form.unsavedTitle'),
      });
      if (!proceed) return;
    }
    onClose();
  };

  return (
    <Dialog fullWidth maxWidth="sm" open onClose={() => void requestClose()}>
      <DialogTitle>
        <Stack alignItems="baseline" direction="row" spacing={1}>
          <Typography variant="h6">{name}</Typography>
          <Typography color="text.secondary" variant="body2">
            {translate(`plugin.hoi4:equipment.kind.${kind}`)}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {domainLabel}
          </Typography>
        </Stack>
        {typeTokens.length > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
            {typeTokens.map((token) => (
              <Chip key={token} label={token} size="small" />
            ))}
          </Stack>
        )}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {fields.map((field, index) => (
            <Stack
              key={field.id}
              alignItems="flex-start"
              direction="row"
              spacing={1}
            >
              <Controller
                control={control}
                name={`rows.${index}.key`}
                render={({ field: keyField, fieldState }) => (
                  <Autocomplete
                    freeSolo
                    inputValue={
                      typeof keyField.value === 'string' ? keyField.value : ''
                    }
                    options={[...KNOWN_AIR_EQUIPMENT_KEYS]}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        error={fieldState.error !== undefined}
                        helperText={fieldState.error?.message}
                        label={translate(
                          'plugin.hoi4:equipment.form.fields.key.label',
                        )}
                      />
                    )}
                    size="small"
                    sx={{ flex: 1 }}
                    onInputChange={(_event, next) => keyField.onChange(next)}
                  />
                )}
              />
              <Controller
                control={control}
                name={`rows.${index}.value`}
                render={({ field: valueField }) => (
                  <TextField
                    {...valueField}
                    label={translate(
                      'plugin.hoi4:equipment.form.fields.value.label',
                    )}
                    size="small"
                    sx={{ flex: 1 }}
                    value={
                      typeof valueField.value === 'string'
                        ? valueField.value
                        : ''
                    }
                  />
                )}
              />
              <Button color="error" onClick={() => remove(index)}>
                {translate('plugin.hoi4:equipment.form.removeField')}
              </Button>
            </Stack>
          ))}
          <Box>
            <Button onClick={() => append({ key: '', value: '' })}>
              {translate('plugin.hoi4:equipment.form.addField')}
            </Button>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={pending} onClick={() => void requestClose()}>
          {translate('plugin.hoi4:equipment.form.cancel')}
        </Button>
        <Button
          disabled={!formState.isDirty || !formState.isValid || pending}
          startIcon={
            pending ? <CircularProgress color="inherit" size={16} /> : null
          }
          variant="contained"
          onClick={handleSubmit((values) => void save(values))}
        >
          {translate('plugin.hoi4:equipment.form.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
