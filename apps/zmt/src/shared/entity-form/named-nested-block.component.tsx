import { Stack, Typography } from '@mui/material';
import { NamedNestedBlock } from '@r-core';
import { Control, FieldValues } from 'react-hook-form';

import { ListOfScalarsBlockView } from './list-of-scalars-block.component';
import { ScalarRows } from './scalar-rows.component';

interface NamedNestedBlockViewProps {
  readonly block: NamedNestedBlock;
  readonly control: Control<FieldValues>;
}

// Named nested block (ADR 018, extended ZMT-13). Renders its own key→scalar rows,
// then any list-of-scalars children (e.g. a role's `traits`), then any named
// children whose leaves are scalars — the one bounded second nesting level (e.g.
// `portraits → army → large`). A key→scalar map reuses the property-bag open
// rendering. Each child binds flat under its own name; the shell and resolver are
// otherwise untouched.
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
      {block.rows.length > 0 || block.knownKeys.length > 0 ? (
        <ScalarRows
          control={control}
          keySuggestions={block.knownKeys}
          name={block.name}
        />
      ) : null}
      {block.listChildren?.map((child) => (
        <ListOfScalarsBlockView
          key={child.name}
          block={child}
          control={control}
        />
      ))}
      {block.namedChildren?.map((child) => (
        <Stack key={child.name} spacing={2}>
          {child.sectionLabel !== undefined && (
            <Typography color="text.secondary" variant="subtitle2">
              {child.sectionLabel}
            </Typography>
          )}
          <ScalarRows
            control={control}
            keySuggestions={child.knownKeys}
            name={child.name}
          />
        </Stack>
      ))}
    </Stack>
  );
}
