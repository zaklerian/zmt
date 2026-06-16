import { Autocomplete, Box, Button, Stack, TextField } from '@mui/material';
import { fieldName, FieldSpec, fieldValidation } from '@r-core';
import {
  Control,
  Controller,
  FieldValues,
  useFieldArray,
  useWatch,
} from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { FieldValueControl } from './field-value-control.component';

interface ScalarRowProps {
  readonly control: Control<FieldValues>;
  readonly index: number;
  readonly keySpecs: readonly FieldSpec[];
  readonly name: string;
  readonly onRemove: () => void;
}

interface ScalarRowsProps {
  readonly control: Control<FieldValues>;
  // Curated key suggestions. A bare-name spec is a free-text suggestion only; a
  // spec carrying `enum` / `type: boolean` makes that key's value render a
  // closed / yes-no select when the row's key matches it.
  readonly keySuggestions: readonly FieldSpec[];
  readonly name: string;
}

// The flat key→value rows shared by the open property-bag block and the
// named-nested block (a key→scalar map reuses the property-bag rendering, ADR
// 018). Controlled by the shell's RHF control (A-REACT-1).
export function ScalarRows({ control, keySuggestions, name }: ScalarRowsProps) {
  const { t } = useTranslation(['feature.entityForm']);
  const { append, fields, remove } = useFieldArray({ control, name });

  return (
    <Stack spacing={2}>
      {fields.map((field, index) => (
        <ScalarRow
          key={field.id}
          control={control}
          index={index}
          keySpecs={keySuggestions}
          name={name}
          onRemove={() => remove(index)}
        />
      ))}
      <Box>
        <Button onClick={() => append({ key: '', value: '' })}>
          {t('feature.entityForm:actions.addField')}
        </Button>
      </Box>
    </Stack>
  );
}

// One row: a free-text key combobox over the known set, plus a value control
// resolved from the matched key's spec (enum → closed select, boolean → yes/no,
// otherwise free text). The key is watched so the value control tracks it live.
function ScalarRow({
  control,
  index,
  keySpecs,
  name,
  onRemove,
}: ScalarRowProps) {
  const { t } = useTranslation(['feature.entityForm']);
  const keyValue = useWatch({ control, name: `${name}.${index}.key` });
  const currentKey = typeof keyValue === 'string' ? keyValue : '';
  const matched = keySpecs.find((spec) => fieldName(spec) === currentKey);

  return (
    <Stack alignItems="flex-start" direction="row" spacing={1}>
      <Controller
        control={control}
        name={`${name}.${index}.key`}
        render={({ field: keyField, fieldState }) => (
          <Autocomplete
            freeSolo
            inputValue={
              typeof keyField.value === 'string' ? keyField.value : ''
            }
            options={keySpecs.map(fieldName)}
            renderInput={(params) => (
              <TextField
                {...params}
                error={fieldState.error !== undefined}
                helperText={fieldState.error?.message}
                label={t('feature.entityForm:fields.key.label')}
              />
            )}
            size="small"
            sx={{ flex: 1 }}
            onInputChange={(_event, next) => keyField.onChange(next)}
          />
        )}
      />
      <Box sx={{ flex: 1 }}>
        <FieldValueControl
          control={control}
          fullWidth
          label={t('feature.entityForm:fields.value.label')}
          name={`${name}.${index}.value`}
          validation={
            matched !== undefined ? fieldValidation(matched) : undefined
          }
        />
      </Box>
      <Button color="error" onClick={onRemove}>
        {t('feature.entityForm:actions.remove')}
      </Button>
    </Stack>
  );
}
