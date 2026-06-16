import { GamePlugin } from '@contracts';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
import { EntityFormBlock, EntityFormModel, EntityFormValues } from '@r-core';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ResolvedModDescriptorSchema } from '../mod-info-edit.model';

import { EntityFormShell } from '../../../shared/entity-form';
import { applyFormValuesToAst, astToFormValues } from '../ast-adapter';
import { modInfoEditActions } from '../mod-info-edit-actions';
import { modInfoEditService } from '../services/mod-info-edit.service';

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

// Field-label lookup table (replaces the former switch-case, R-WORK-7): keys
// known to the descriptor map to i18n keys; an unknown plugin-extension key
// falls back to its raw name.
const FIELD_LABEL_KEYS: Readonly<Record<string, string>> = {
  name: 'feature.modInfoEdit:form.fields.name.label',
  path: 'feature.modInfoEdit:form.fields.path.label',
  picture: 'feature.modInfoEdit:form.fields.picture.label',
  supported_version: 'feature.modInfoEdit:form.fields.supportedVersion.label',
  tags: 'feature.modInfoEdit:form.fields.tags.label',
  version: 'feature.modInfoEdit:form.fields.version.label',
};

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
  const [savedAt, setSavedAt] = useState<null | number>(null);

  const model = useMemo<EntityFormModel>(() => {
    const fieldLabel = (name: string): string => {
      const key = FIELD_LABEL_KEYS[name];
      return key === undefined ? name : (t as (k: string) => string)(key);
    };

    const persist = async (
      values: EntityFormValues,
    ): Promise<EntityFormValues | void> => {
      const ast = astRef.current;
      if (ast === null) return;
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
      return astToFormValues(refreshedAst, schema) as EntityFormValues;
    };

    const save = async (
      values: EntityFormValues,
    ): Promise<EntityFormValues | void> => {
      let refreshed: EntityFormValues | void = undefined;
      await modInfoEditActions.save.execute({
        onRefreshed: (next) => {
          refreshed = next;
        },
        save: persist,
        values,
      });
      return refreshed;
    };

    return {
      // The mod descriptor supplies its own Zod schema via the existing
      // plugin-extension path (ADR 010/011) through the shell's external-schema
      // resolver input (ADR 018), rather than the descriptor-generated path.
      blocks: buildDescriptorBlocks(
        schema,
        defaultValues,
        fieldLabel,
        t('feature.modInfoEdit:form.fields.tags.placeholder'),
      ),
      errorMessage: () => t('feature.modInfoEdit:errors.message'),
      errorTitle: t('feature.modInfoEdit:errors.title'),
      save,
      schema: () => schema,
    };
  }, [
    astRef,
    defaultValues,
    descriptorPath,
    originalSourceRef,
    plugin,
    schema,
    t,
  ]);

  return (
    <Stack spacing={2}>
      <EntityFormShell model={model} onSaved={() => setSavedAt(Date.now())} />

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
                    secondary={t('feature.modInfoEdit:warnings.parser.offset', {
                      from: err.from,
                      to: err.to,
                    })}
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}

      <Snackbar
        autoHideDuration={3000}
        message={t('feature.modInfoEdit:save.success')}
        open={savedAt !== null}
        onClose={() => setSavedAt(null)}
      />
    </Stack>
  );
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asStringArray(value: unknown): readonly string[] {
  return Array.isArray(value) ? (value as readonly string[]) : [];
}

// Walks the schema keys in their declared order, emitting fixed-field bags and
// a tags list block in place so field order matches the pre-migration form.
// `name` is read-only.
function buildDescriptorBlocks(
  schema: ResolvedModDescriptorSchema,
  defaultValues: Record<string, unknown>,
  fieldLabel: (name: string) => string,
  tagsPlaceholder: string,
): readonly EntityFormBlock[] {
  const schemaKeys = Object.keys(schema.shape);
  const extensionKeys = schemaKeys.filter((k) => !BASE_FIELD_ORDER.includes(k));
  const orderedKeys = [
    ...BASE_FIELD_ORDER.filter((k) => schemaKeys.includes(k)),
    ...extensionKeys,
  ];

  const blocks: EntityFormBlock[] = [];
  let fields: {
    label: string;
    readonly: boolean;
    spec: string;
    value: string;
  }[] = [];

  const flushFields = (): void => {
    if (fields.length === 0) return;
    blocks.push({
      kind: 'propertyBag',
      members: { fields, mode: 'fixed' },
      scope: null,
    });
    fields = [];
  };

  for (const key of orderedKeys) {
    if (key === 'tags') {
      flushFields();
      blocks.push({
        kind: 'listOfScalars',
        label: fieldLabel('tags'),
        name: 'tags',
        placeholder: tagsPlaceholder,
        scope: null,
        values: asStringArray(defaultValues[key]),
      });
      continue;
    }
    fields.push({
      label: fieldLabel(key),
      readonly: key === 'name',
      spec: key,
      value: asString(defaultValues[key]),
    });
  }
  flushFields();

  return blocks;
}
