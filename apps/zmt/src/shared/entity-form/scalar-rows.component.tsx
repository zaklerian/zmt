import { Autocomplete, Box, Button, Stack, TextField } from '@mui/material';
import {
  Control,
  Controller,
  FieldValues,
  useFieldArray,
} from 'react-hook-form';
import { useTranslation } from 'react-i18next';

interface ScalarRowsProps {
  readonly control: Control<FieldValues>;
  readonly keySuggestions: readonly string[];
  readonly name: string;
}

// The flat key→value rows shared by the open property-bag block and the
// named-nested block (a key→scalar map reuses the property-bag rendering, ADR
// 018). Keys are a free-text combobox over the curated known set. Controlled by
// the shell's RHF control (A-REACT-1).
export function ScalarRows({ control, keySuggestions, name }: ScalarRowsProps) {
  const { t } = useTranslation(['feature.entityForm']);
  const { append, fields, remove } = useFieldArray({ control, name });

  return (
    <Stack spacing={2}>
      {fields.map((field, index) => (
        <Stack
          key={field.id}
          alignItems="flex-start"
          direction="row"
          spacing={1}
        >
          <Controller
            control={control}
            name={`${name}.${index}.key`}
            render={({ field: keyField, fieldState }) => (
              <Autocomplete
                freeSolo
                inputValue={
                  typeof keyField.value === 'string' ? keyField.value : ''
                }
                options={[...keySuggestions]}
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
          <Controller
            control={control}
            name={`${name}.${index}.value`}
            render={({ field: valueField }) => (
              <TextField
                {...valueField}
                label={t('feature.entityForm:fields.value.label')}
                size="small"
                sx={{ flex: 1 }}
                value={
                  typeof valueField.value === 'string' ? valueField.value : ''
                }
              />
            )}
          />
          <Button color="error" onClick={() => remove(index)}>
            {t('feature.entityForm:actions.remove')}
          </Button>
        </Stack>
      ))}
      <Box>
        <Button onClick={() => append({ key: '', value: '' })}>
          {t('feature.entityForm:actions.addField')}
        </Button>
      </Box>
    </Stack>
  );
}
