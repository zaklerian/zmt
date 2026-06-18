import { Box, Button, Divider, Stack, TextField } from '@mui/material';
import {
  EditableKeyedMap,
  fieldName,
  fieldValidation,
  KEYED_MAP_ENTRY_KEY,
} from '@r-core';
import {
  Control,
  Controller,
  FieldValues,
  useFieldArray,
} from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { FieldValueControl } from './field-value-control.component';

interface KeyedObjectMapBlockViewProps {
  readonly control: Control<FieldValues>;
  readonly map: EditableKeyedMap;
  // The named-nested block's field-array binding (the map block name, e.g.
  // `types`) — each element is one keyed entry record.
  readonly name: string;
}

// The opt-in editable variable-key map (ADR 018, amended ZMT-18). Renders the
// block's `namedChildren` as add/remove/rename entry cards: each card has an
// editable key field plus the per-entry scalar template, a new entry seeds from
// that template, and remove deletes the entry. The read-only `namedChildren`
// rendering (character portraits) is unaffected — this view is reached only when
// the descriptor sets `editableKeyedMap`. Controlled by the shell's RHF control
// (A-REACT-1); entries bind by position to the field-array under `name`.
export function KeyedObjectMapBlockView({
  control,
  map,
  name,
}: KeyedObjectMapBlockViewProps) {
  const { t } = useTranslation(['feature.entityForm']);
  const { append, fields, remove } = useFieldArray({ control, name });

  const appendEntry = (): void => {
    const entry: Record<string, unknown> = { [KEYED_MAP_ENTRY_KEY]: '' };
    for (const field of map.entryFields) entry[fieldName(field.spec)] = '';
    append(entry);
  };

  return (
    <Stack spacing={2}>
      {fields.map((field, index) => (
        <Stack
          key={field.id}
          spacing={2}
          sx={{ borderColor: 'divider', borderLeft: 2, pl: 2 }}
        >
          <Stack alignItems="flex-start" direction="row" spacing={1}>
            <Controller
              control={control}
              name={`${name}.${String(index)}.${KEYED_MAP_ENTRY_KEY}`}
              render={({ field: keyField, fieldState }) => (
                <TextField
                  {...keyField}
                  error={fieldState.error !== undefined}
                  helperText={fieldState.error?.message}
                  label={map.keyLabel}
                  placeholder={map.keyPlaceholder}
                  size="small"
                  sx={{ flex: 1 }}
                  value={
                    typeof keyField.value === 'string' ? keyField.value : ''
                  }
                />
              )}
            />
            <Button color="error" onClick={() => remove(index)}>
              {t('feature.entityForm:actions.remove')}
            </Button>
          </Stack>
          {map.entryFields.map((field) => (
            <FieldValueControl
              key={fieldName(field.spec)}
              control={control}
              fullWidth
              label={field.label}
              name={`${name}.${String(index)}.${fieldName(field.spec)}`}
              validation={fieldValidation(field.spec)}
            />
          ))}
          <Divider />
        </Stack>
      ))}
      <Box>
        <Button onClick={appendEntry}>{map.addLabel}</Button>
      </Box>
    </Stack>
  );
}
