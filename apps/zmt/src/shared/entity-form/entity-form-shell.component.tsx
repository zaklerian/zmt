import { IPC_ERROR_CODES, IpcError, isIpcError } from '@contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { EntityFormBlock, EntityFormModel, EntityFormValues } from '@r-core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Control, FieldValues, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useBlocker } from 'react-router';
import { z } from 'zod';

import { useShell } from '../../app/shell/shell-context';
import { useModal } from '../modal';
import {
  buildEntityFormDefaults,
  buildEntityFormSchema,
} from './entity-form-rhf.util';
import { ListOfScalarsBlockView } from './list-of-scalars-block.component';
import { NamedNestedBlockView } from './named-nested-block.component';
import { ObjectListBlockView } from './object-list-block.component';
import { PropertyBagBlockView } from './property-bag-block.component';

interface EntityFormShellProps {
  readonly model: EntityFormModel;
  // Present → modal-dialog chrome (the form is an overlay opened from a list);
  // absent → inline chrome (the form is embedded in a route).
  readonly onClose?: () => void;
  readonly onSaved?: () => void;
}

// The entity-agnostic form shell (ADR 018). Composes the descriptor's blocks,
// wires RHF, tracks dirty, runs the resolver (descriptor-generated OR
// externally-supplied Zod), guards unsaved changes, and dispatches save. It
// carries no entity-specific knowledge — everything game-specific arrives
// pre-resolved on the model.
export function EntityFormShell({
  model,
  onClose,
  onSaved,
}: EntityFormShellProps) {
  const { t } = useTranslation(['feature.entityForm', 'app']);
  const modal = useModal();
  const { consumeLeaveConfirmed, registerEditGuard } = useShell();

  const defaultValues = useMemo(
    () => buildEntityFormDefaults(model.blocks),
    [model.blocks],
  );
  const schema = useMemo(
    () =>
      model.schema !== undefined
        ? (model.schema() as z.ZodTypeAny)
        : buildEntityFormSchema(model.blocks, {
            keyDuplicate: t('feature.entityForm:validation.keyDuplicate'),
            keyRequired: t('feature.entityForm:validation.keyRequired'),
          }),
    [model, t],
  );

  const methods = useForm<FieldValues>({
    defaultValues,
    mode: 'onChange',
    resolver: zodResolver(schema),
  });
  const control = methods.control as unknown as Control<FieldValues>;
  const [pending, setPending] = useState(false);

  // Ref-backed dirty predicate published to the shell's single-slot edit guard
  // (A-REACT-3) — re-registration on remount never re-renders the app shell.
  const isDirty = methods.formState.isDirty;
  const dirtyRef = useRef(isDirty);
  useEffect(() => {
    dirtyRef.current = isDirty;
  }, [isDirty]);
  useEffect(
    () => registerEditGuard(() => dirtyRef.current),
    [registerEditGuard],
  );

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    // The app-shell gate already obtained consent for this transition; skip the
    // re-prompt and clear the flag so the next navigation is guarded normally.
    if (consumeLeaveConfirmed()) return false;
    return (
      methods.formState.isDirty &&
      currentLocation.pathname !== nextLocation.pathname
    );
  });

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    let active = true;
    void (async () => {
      try {
        const proceed = await modal.confirm({
          confirmLabel: t('app:actions.discard'),
          message: t('feature.entityForm:unsavedMessage'),
          title: t('app:modals.unsavedChanges.title'),
        });
        if (!active) return;
        if (proceed) blocker.proceed?.();
        else blocker.reset?.();
      } catch {
        if (active) blocker.reset?.();
      }
    })();
    return () => {
      active = false;
    };
  }, [blocker, modal, t]);

  const surfaceError = async (rawError: unknown): Promise<void> => {
    const error: IpcError = isIpcError(rawError)
      ? rawError
      : { code: IPC_ERROR_CODES.INTERNAL, message: String(rawError) };
    await modal.info({
      message: model.errorMessage(error.code),
      title: model.errorTitle,
    });
  };

  const submit = async (values: FieldValues): Promise<void> => {
    setPending(true);
    try {
      const next = await model.save(values as EntityFormValues);
      methods.reset(next ?? values);
      onSaved?.();
      onClose?.();
    } catch (rawError: unknown) {
      await surfaceError(rawError);
    } finally {
      setPending(false);
    }
  };

  const requestClose = async (): Promise<void> => {
    if (methods.formState.isDirty) {
      const proceed = await modal.confirm({
        confirmLabel: t('app:actions.discard'),
        message: t('feature.entityForm:unsavedMessage'),
        title: t('app:modals.unsavedChanges.title'),
      });
      if (!proceed) return;
    }
    onClose?.();
  };

  const blocks = (
    <Stack spacing={3} sx={{ mt: 1 }}>
      {model.blocks.map((block, index) => renderBlock(block, index, control))}
    </Stack>
  );

  const saveButton = (
    <Button
      disabled={!isDirty || pending}
      startIcon={
        pending ? <CircularProgress color="inherit" size={16} /> : null
      }
      variant="contained"
      onClick={methods.handleSubmit((values) => void submit(values))}
    >
      {t('app:actions.save')}
    </Button>
  );

  if (onClose === undefined) {
    return (
      <Stack spacing={2}>
        {blocks}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          {saveButton}
        </Box>
      </Stack>
    );
  }

  return (
    <Dialog fullWidth maxWidth="md" open onClose={() => void requestClose()}>
      <DialogTitle>
        <Stack alignItems="baseline" direction="row" spacing={1}>
          <Typography variant="h6">{model.dialogTitle}</Typography>
          {model.note !== undefined && model.note !== '' && (
            <Typography color="text.secondary" variant="body2">
              {model.note}
            </Typography>
          )}
        </Stack>
      </DialogTitle>
      <DialogContent>{blocks}</DialogContent>
      <DialogActions>
        <Button disabled={pending} onClick={() => void requestClose()}>
          {t('app:actions.cancel')}
        </Button>
        {saveButton}
      </DialogActions>
    </Dialog>
  );
}

function blockKey(block: EntityFormBlock, index: number): string {
  if (
    block.kind === 'listOfScalars' ||
    block.kind === 'namedNested' ||
    block.kind === 'objectList'
  ) {
    return block.name;
  }
  return block.members.mode === 'open' ? block.members.name : `fixed-${index}`;
}

function renderBlock(
  block: EntityFormBlock,
  index: number,
  control: Control<FieldValues>,
) {
  const key = blockKey(block, index);
  if (block.kind === 'listOfScalars') {
    return <ListOfScalarsBlockView key={key} block={block} control={control} />;
  }
  if (block.kind === 'namedNested') {
    return <NamedNestedBlockView key={key} block={block} control={control} />;
  }
  if (block.kind === 'objectList') {
    return <ObjectListBlockView key={key} block={block} control={control} />;
  }
  return <PropertyBagBlockView key={key} block={block} control={control} />;
}
