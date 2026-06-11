import {
  AppApiModel,
  CatalogModule,
  EntityField,
  EquipmentEntity,
  EquipmentSlotsResult,
  IPC_ERROR_CODES,
  IpcError,
  isIpcError,
  ModuleSlot,
} from '@contracts';
import {
  Alert,
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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { equipmentErrorMessageKey } from './equipment-error.util';
import { buildDefaultModulesDelta } from './slot-delta.util';

interface SlotDesignerBodyProps extends SlotDesignerProps {
  readonly catalog: readonly CatalogModule[];
  readonly slotsResult: EquipmentSlotsResult;
  readonly translate: (key: string) => string;
}

interface SlotDesignerProps {
  readonly entity: EquipmentEntity;
  readonly modal: ModalService;
  readonly modId: string;
  readonly onClose: () => void;
  readonly onSaved: () => void;
  readonly relativePath: string;
}

export function SlotDesigner({
  entity,
  modal,
  modId,
  onClose,
  onSaved,
  relativePath,
}: SlotDesignerProps) {
  // plugin.hoi4 keys are runtime-registered and not in the app's typed resource
  // map; cast t() to the loose key signature as the recognizer surfaces do.
  const { t } = useTranslation();
  const translate = useCallback(
    (key: string): string => (t as (key: string) => string)(key),
    [t],
  );

  const [loaded, setLoaded] = useState<{
    readonly catalog: readonly CatalogModule[];
    readonly slotsResult: EquipmentSlotsResult;
  } | null>(null);
  const [errorCode, setErrorCode] = useState<null | number>(null);

  useEffect(() => {
    let cancelled = false;
    const { api } = window as unknown as { readonly api: AppApiModel };
    Promise.all([
      api.equipment.slots({
        entityName: entity.name,
        modId,
        relativePath,
      }),
      api.module.catalog(),
    ])
      .then(([slotsResult, catalog]) => {
        if (!cancelled) setLoaded({ catalog, slotsResult });
      })
      .catch((rawError: unknown) => {
        if (!cancelled) {
          setErrorCode(
            isIpcError(rawError) ? rawError.code : IPC_ERROR_CODES.INTERNAL,
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [entity.name, modId, relativePath]);

  if (errorCode !== null) {
    return (
      <Dialog fullWidth maxWidth="sm" open onClose={onClose}>
        <DialogContent>
          <Alert severity="error">
            {translate(equipmentErrorMessageKey(errorCode))}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>
            {translate('plugin.hoi4:equipment.form.cancel')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (loaded === null) {
    return (
      <Dialog fullWidth maxWidth="sm" open onClose={onClose}>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <SlotDesignerBody
      catalog={loaded.catalog}
      entity={entity}
      modId={modId}
      modal={modal}
      relativePath={relativePath}
      slotsResult={loaded.slotsResult}
      translate={translate}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function optionsForSlot(
  slot: ModuleSlot,
  catalog: readonly CatalogModule[],
  current: string,
): readonly string[] {
  const allowed = catalog
    .filter((module) => slot.allowedCategories.includes(module.category))
    .map((module) => module.name);
  // R-CODE-5: a current assignment outside the allowed-category filter is real
  // data; surface it as an option rather than dropping it from the picker.
  const withCurrent =
    current !== '' && !allowed.includes(current)
      ? [current, ...allowed]
      : allowed;
  return [...withCurrent].sort((left, right) => left.localeCompare(right));
}

function SlotDesignerBody({
  catalog,
  entity,
  modal,
  modId,
  onClose,
  onSaved,
  relativePath,
  slotsResult,
  translate,
}: SlotDesignerBodyProps) {
  const { slots } = slotsResult;

  // Snapshot the open-time slot→module assignment set so save diffs against the
  // original rather than the (mutated) picker state. Seeded per rendered slot, so
  // any default_modules entry without a matching slot is left untouched.
  const initial = useMemo<Record<string, string>>(() => {
    const bySlot = new Map(
      slotsResult.assignments.map((field) => [field.key, field.value] as const),
    );
    return Object.fromEntries(
      slots.map((slot) => [slot.name, bySlot.get(slot.name) ?? '']),
    );
  }, [slots, slotsResult.assignments]);
  const snapshot = useMemo<readonly EntityField[]>(
    () =>
      Object.entries(initial)
        .filter(([, value]) => value !== '')
        .map(([key, value]) => ({ key, value })),
    [initial],
  );

  const [assignments, setAssignments] =
    useState<Record<string, string>>(initial);
  const [pending, setPending] = useState(false);

  const dirty = slots.some(
    (slot) => (assignments[slot.name] ?? '') !== (initial[slot.name] ?? ''),
  );
  const domainLabel =
    entity.classification.status === 'classified'
      ? translate(
          `plugin.hoi4:equipment.domain.${entity.classification.domain}`,
        )
      : '';

  const setAssignment = (slotName: string, moduleName: string): void =>
    setAssignments((prev) => ({ ...prev, [slotName]: moduleName }));

  const surfaceError = async (rawError: unknown): Promise<void> => {
    const error: IpcError = isIpcError(rawError)
      ? rawError
      : { code: IPC_ERROR_CODES.INTERNAL, message: String(rawError) };
    await modal.info({
      message: translate(equipmentErrorMessageKey(error.code)),
      title: translate('plugin.hoi4:equipment.errors.title'),
    });
  };

  const save = async (): Promise<void> => {
    setPending(true);
    try {
      const delta = buildDefaultModulesDelta(snapshot, assignments);
      const { api } = window as unknown as { readonly api: AppApiModel };
      await api.entity.write({
        deltas: [delta],
        entityName: entity.name,
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
    if (dirty) {
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
          <Typography variant="h6">{entity.name}</Typography>
          <Typography color="text.secondary" variant="body2">
            {domainLabel}
          </Typography>
        </Stack>
        <Typography color="text.secondary" variant="body2">
          {translate('plugin.hoi4:equipment.designer.title')}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {slots.map((slot) => {
            const current = assignments[slot.name] ?? '';
            const unfilled = slot.required && current === '';
            return (
              <Stack key={slot.name} spacing={1}>
                <Stack alignItems="center" direction="row" spacing={1}>
                  <Typography variant="subtitle2">{slot.name}</Typography>
                  {slot.required && (
                    <Chip
                      color="primary"
                      label={translate(
                        'plugin.hoi4:equipment.designer.required',
                      )}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Stack>
                {slot.allowedCategories.length > 0 && (
                  <Stack
                    direction="row"
                    flexWrap="wrap"
                    spacing={0.5}
                    useFlexGap
                  >
                    {slot.allowedCategories.map((category) => (
                      <Chip key={category} label={category} size="small" />
                    ))}
                  </Stack>
                )}
                <Autocomplete
                  clearText={translate('plugin.hoi4:equipment.designer.clear')}
                  options={[...optionsForSlot(slot, catalog, current)]}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder={translate(
                        'plugin.hoi4:equipment.designer.pickerPlaceholder',
                      )}
                    />
                  )}
                  size="small"
                  value={current === '' ? null : current}
                  onChange={(_event, next) =>
                    setAssignment(slot.name, next ?? '')
                  }
                />
                {unfilled && (
                  <Alert severity="warning">
                    {translate(
                      'plugin.hoi4:equipment.designer.unfilledWarning',
                    )}
                  </Alert>
                )}
              </Stack>
            );
          })}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={pending} onClick={() => void requestClose()}>
          {translate('plugin.hoi4:equipment.form.cancel')}
        </Button>
        <Button
          disabled={!dirty || pending}
          startIcon={
            pending ? <CircularProgress color="inherit" size={16} /> : null
          }
          variant="contained"
          onClick={() => void save()}
        >
          {translate('plugin.hoi4:equipment.form.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
