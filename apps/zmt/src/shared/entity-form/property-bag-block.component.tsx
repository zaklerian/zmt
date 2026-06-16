import { Stack, Typography } from '@mui/material';
import { fieldName, fieldValidation, PropertyBagBlock } from '@r-core';
import { Control, FieldValues } from 'react-hook-form';

import { FieldValueControl } from './field-value-control.component';
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
          <FieldValueControl
            key={fieldName(field.spec)}
            control={control}
            disabled={field.readonly === true}
            fullWidth
            label={field.label}
            name={fieldName(field.spec)}
            validation={fieldValidation(field.spec)}
          />
        ))
      )}
    </Stack>
  );
}
