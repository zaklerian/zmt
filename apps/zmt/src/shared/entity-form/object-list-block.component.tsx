import { Box, Button, Divider, Stack, Typography } from '@mui/material';
import {
  fieldName,
  fieldValidation,
  OBJECT_LIST_ITEM_INDEX_KEY,
  ObjectListBlock,
} from '@r-core';
import { Control, FieldValues, useFieldArray } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { FieldValueControl } from './field-value-control.component';

interface ObjectListBlockViewProps {
  readonly block: ObjectListBlock;
  readonly control: Control<FieldValues>;
}

// Object-list block (ADR 018, extended ZMT-14). Renders the repeated same-named
// blocks as positional item cards: each card shows the item's scalar fields and,
// if present, its one nested object's fields. Add appends a fresh item (no
// original index — materialized as a new block on save); remove deletes the card
// (the addressed block is dropped on save). Controlled by the shell's RHF control
// (A-REACT-1); items bind by position to the field-array under `block.name`.
export function ObjectListBlockView({
  block,
  control,
}: ObjectListBlockViewProps) {
  const { t } = useTranslation(['feature.entityForm']);
  const { append, fields, remove } = useFieldArray({
    control,
    name: block.name,
  });
  // Hoisted to a const so its narrowed type survives into the row callbacks.
  const nested = block.nested;

  const appendItem = (): void => {
    const item: Record<string, unknown> = {
      [OBJECT_LIST_ITEM_INDEX_KEY]: null,
    };
    for (const field of block.fields) item[fieldName(field.spec)] = '';
    if (nested !== undefined) {
      const nestedValue: Record<string, unknown> = {};
      for (const field of nested.fields)
        nestedValue[fieldName(field.spec)] = '';
      item[nested.name] = nestedValue;
    }
    append(item);
  };

  return (
    <Stack spacing={2}>
      {block.sectionLabel !== undefined && (
        <Typography color="text.secondary" variant="subtitle2">
          {block.sectionLabel}
        </Typography>
      )}
      {fields.map((field, index) => (
        <Stack
          key={field.id}
          spacing={2}
          sx={{ borderColor: 'divider', borderLeft: 2, pl: 2 }}
        >
          <Stack
            alignItems="center"
            direction="row"
            justifyContent="space-between"
          >
            <Typography variant="subtitle2">
              {`${block.itemLabel} ${String(index + 1)}`}
            </Typography>
            <Button color="error" onClick={() => remove(index)}>
              {t('feature.entityForm:actions.remove')}
            </Button>
          </Stack>
          {block.fields.map((itemField) => (
            <FieldValueControl
              key={fieldName(itemField.spec)}
              control={control}
              fullWidth
              label={itemField.label}
              name={`${block.name}.${String(index)}.${fieldName(itemField.spec)}`}
              validation={fieldValidation(itemField.spec)}
            />
          ))}
          {nested !== undefined && (
            <Stack spacing={2}>
              {nested.sectionLabel !== undefined && (
                <Typography color="text.secondary" variant="caption">
                  {nested.sectionLabel}
                </Typography>
              )}
              {nested.fields.map((nestedField) => (
                <FieldValueControl
                  key={fieldName(nestedField.spec)}
                  control={control}
                  fullWidth
                  label={nestedField.label}
                  name={`${block.name}.${String(index)}.${nested.name}.${fieldName(nestedField.spec)}`}
                  validation={fieldValidation(nestedField.spec)}
                />
              ))}
            </Stack>
          )}
          <Divider />
        </Stack>
      ))}
      <Box>
        <Button onClick={appendItem}>{block.addLabel}</Button>
      </Box>
    </Stack>
  );
}
