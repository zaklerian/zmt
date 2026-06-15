import { Stack, TextField, Typography } from '@mui/material';
import { fieldName, PropertyBagBlock } from '@r-core';
import { Control, Controller, FieldValues } from 'react-hook-form';

import { ScalarRows } from './scalar-rows.component';

interface PropertyBagBlockViewProps {
  readonly block: PropertyBagBlock;
  readonly control: Control<FieldValues>;
}

// Scalar / property bag (ADR 018). Open mode renders free key→value rows over a
// known-set combobox; fixed mode renders one labelled value input per field
// (the key is a resolved label, not editable), bound to a root value key.
export function PropertyBagBlockView({
  block,
  control,
}: PropertyBagBlockViewProps) {
  return (
    <Stack spacing={2}>
      {block.sectionLabel !== undefined && (
        <Typography color="text.secondary" variant="subtitle2">
          {block.sectionLabel}
        </Typography>
      )}
      {block.members.mode === 'open' ? (
        <ScalarRows
          control={control}
          keySuggestions={block.members.knownKeys}
          name={block.members.name}
        />
      ) : (
        block.members.fields.map((field) => (
          <Controller
            key={fieldName(field.spec)}
            control={control}
            name={fieldName(field.spec)}
            render={({ field: rhfField, fieldState }) => (
              <TextField
                {...rhfField}
                disabled={field.readonly === true}
                error={fieldState.error !== undefined}
                fullWidth
                helperText={fieldState.error?.message}
                label={field.label}
                size="small"
                value={typeof rhfField.value === 'string' ? rhfField.value : ''}
              />
            )}
          />
        ))
      )}
    </Stack>
  );
}
