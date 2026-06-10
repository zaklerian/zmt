import {
  Autocomplete,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Control,
  Controller,
  FieldValues,
  useFieldArray,
} from 'react-hook-form';

interface ScalarBagProps {
  readonly addLabel: string;
  // The parent form's control. Typed loosely so one bag serves forms with
  // differently-shaped value objects; the field-array name selects the slice.
  readonly control: Control<FieldValues>;
  readonly keyLabel: string;
  readonly keySuggestions: readonly string[];
  readonly name: string;
  readonly removeLabel: string;
  readonly sectionLabel?: string;
  readonly valueLabel: string;
}

export function ScalarBag({
  addLabel,
  control,
  keyLabel,
  keySuggestions,
  name,
  removeLabel,
  sectionLabel,
  valueLabel,
}: ScalarBagProps) {
  const { append, fields, remove } = useFieldArray({ control, name });

  return (
    <Stack spacing={2}>
      {sectionLabel !== undefined && (
        <Typography color="text.secondary" variant="subtitle2">
          {sectionLabel}
        </Typography>
      )}
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
                    label={keyLabel}
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
                label={valueLabel}
                size="small"
                sx={{ flex: 1 }}
                value={
                  typeof valueField.value === 'string' ? valueField.value : ''
                }
              />
            )}
          />
          <Button color="error" onClick={() => remove(index)}>
            {removeLabel}
          </Button>
        </Stack>
      ))}
      <Box>
        <Button onClick={() => append({ key: '', value: '' })}>
          {addLabel}
        </Button>
      </Box>
    </Stack>
  );
}
