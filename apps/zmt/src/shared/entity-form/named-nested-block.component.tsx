import { Stack, Typography } from '@mui/material';
import { NamedNestedBlock } from '@r-core';
import { Control, FieldValues } from 'react-hook-form';

import { ScalarRows } from './scalar-rows.component';

interface NamedNestedBlockViewProps {
  readonly block: NamedNestedBlock;
  readonly control: Control<FieldValues>;
}

// Named nested block (ADR 018): one level deep, no recursion, named-child write
// scope. A key→scalar map reuses the property-bag open rendering rather than
// introducing a fourth block.
export function NamedNestedBlockView({
  block,
  control,
}: NamedNestedBlockViewProps) {
  return (
    <Stack spacing={2}>
      {block.sectionLabel !== undefined && (
        <Typography color="text.secondary" variant="subtitle2">
          {block.sectionLabel}
        </Typography>
      )}
      <ScalarRows
        control={control}
        keySuggestions={block.knownKeys}
        name={block.name}
      />
    </Stack>
  );
}
