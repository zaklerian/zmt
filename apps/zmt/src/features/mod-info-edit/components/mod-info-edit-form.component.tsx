import { GamePlugin, IpcError, isIpcError } from '@contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import {
  dialectsFromPlugins,
  parse,
  type ParseError,
  type Script,
  serialize,
} from '@paradox-parser';
import { useEffect, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useBlocker } from 'react-router';

import type {
  ModDescriptorFormValues,
  ResolvedModDescriptorSchema,
} from '../mod-info-edit.model';

import { useShell } from '../../../app/shell/shell-context';
import { useAsyncCallback } from '../../../shared/hooks';
import { useModal } from '../../../shared/modal';
import { applyFormValuesToAst, astToFormValues } from '../ast-adapter';
import { modInfoEditService } from '../services/mod-info-edit.service';
import {
  ModInfoEditTagsField,
  ModInfoEditTextField,
} from './mod-info-edit-field.component';

interface ModInfoEditFormProps {
  readonly astRef: React.RefObject<null | Script>;
  readonly defaultValues: Record<string, unknown>;
  descriptorPath: string;
  readonly originalSourceRef: React.RefObject<string>;
  readonly parseErrors: readonly ParseError[];
  readonly plugin: GamePlugin;
  readonly schema: ResolvedModDescriptorSchema;
}

const BASE_FIELD_ORDER: readonly string[] = [
  'name',
  'version',
  'supported_version',
  'tags',
  'picture',
  'path',
];

export function ModInfoEditForm({
  astRef,
  defaultValues,
  descriptorPath,
  originalSourceRef,
  parseErrors,
  plugin,
  schema,
}: ModInfoEditFormProps) {
  const { t } = useTranslation(['feature.modInfoEdit', 'app']);
  const modal = useModal();
  const { registerEditGuard } = useShell();
  const methods = useForm<ModDescriptorFormValues>({
    defaultValues: defaultValues as ModDescriptorFormValues,
    resolver: zodResolver(schema),
  });

  // Ref-backed predicate so the shell consults current dirtiness through one
  // stable registration (register on mount, unregister on unmount) rather than
  // re-registering on every field edit (A-REACT-3).
  const isDirty = methods.formState.isDirty;
  const dirtyRef = useRef(isDirty);
  useEffect(() => {
    dirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(
    () => registerEditGuard(() => dirtyRef.current),
    [registerEditGuard],
  );

  const fieldLabel = (name: string): string => {
    switch (name) {
      case 'name':
        return t('feature.modInfoEdit:form.fields.name.label');
      case 'path':
        return t('feature.modInfoEdit:form.fields.path.label');
      case 'picture':
        return t('feature.modInfoEdit:form.fields.picture.label');
      case 'supported_version':
        return t('feature.modInfoEdit:form.fields.supportedVersion.label');
      case 'tags':
        return t('feature.modInfoEdit:form.fields.tags.label');
      case 'version':
        return t('feature.modInfoEdit:form.fields.version.label');
      default:
        return name;
    }
  };

  const [saveError, setSaveError] = useState<IpcError | null>(null);
  const [savedAt, setSavedAt] = useState<null | number>(null);

  const save = useAsyncCallback(async (values: ModDescriptorFormValues) => {
    setSaveError(null);
    const ast = astRef.current;
    if (ast === null) return;
    try {
      applyFormValuesToAst(
        ast,
        values as Readonly<Record<string, unknown>>,
        schema,
      );
      const newText = serialize(ast, originalSourceRef.current);
      await modInfoEditService.writeDescriptor(descriptorPath, newText);

      const refreshedAst = parse(newText, {
        dialects: dialectsFromPlugins([plugin]),
      });
      astRef.current = refreshedAst;
      originalSourceRef.current = newText;
      methods.reset(
        astToFormValues(refreshedAst, schema) as ModDescriptorFormValues,
      );
      setSavedAt(Date.now());
    } catch (rawError: unknown) {
      const error: IpcError = isIpcError(rawError)
        ? rawError
        : { code: 500, message: String(rawError) };
      setSaveError(error);
    }
  });

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      methods.formState.isDirty &&
      currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    let active = true;
    void (async () => {
      try {
        const proceed = await modal.confirm({
          confirmLabel: t('app:actions.discard'),
          message: t('feature.modInfoEdit:save.unsavedMessage'),
          title: t('app:modals.unsavedChanges.title'),
        });
        if (!active) return;
        if (proceed) blocker.proceed?.();
        else blocker.reset?.();
      } catch {
        if (!active) return;
        blocker.reset?.();
      }
    })();
    return () => {
      active = false;
    };
  }, [blocker, modal, t]);

  const schemaKeys = Object.keys(schema.shape);
  const extensionKeys = schemaKeys.filter((k) => !BASE_FIELD_ORDER.includes(k));
  const orderedKeys = [
    ...BASE_FIELD_ORDER.filter((k) => schemaKeys.includes(k)),
    ...extensionKeys,
  ];

  return (
    <FormProvider {...methods}>
      <Stack spacing={2}>
        {orderedKeys.map((key) =>
          isTagsField(key) ? (
            <ModInfoEditTagsField
              key={key}
              label={fieldLabel(key)}
              name={key}
            />
          ) : (
            <ModInfoEditTextField
              key={key}
              label={fieldLabel(key)}
              name={key}
            />
          ),
        )}

        {saveError !== null && (
          <Alert severity="error">{saveError.message}</Alert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
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
        </Box>

        {parseErrors.length > 0 && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2">
                {t('feature.modInfoEdit:warnings.parser.title', {
                  count: parseErrors.length,
                })}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                {parseErrors.map((err, idx) => (
                  <ListItem key={`${err.from}-${err.to}-${idx}`} disableGutters>
                    <ListItemText
                      primary={err.message}
                      secondary={t(
                        'feature.modInfoEdit:warnings.parser.offset',
                        {
                          from: err.from,
                          to: err.to,
                        },
                      )}
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        )}
      </Stack>

      <Snackbar
        autoHideDuration={3000}
        message={t('feature.modInfoEdit:save.success')}
        open={savedAt !== null}
        onClose={() => setSavedAt(null)}
      />
    </FormProvider>
  );
}

function isTagsField(name: string): boolean {
  return name === 'tags';
}
