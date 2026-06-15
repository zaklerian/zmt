import {
  Autocomplete,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ListOfScalarsBlock } from '@r-core';
import { Control, Controller, FieldValues } from 'react-hook-form';

interface ListOfScalarsBlockViewProps {
  readonly block: ListOfScalarsBlock;
  readonly control: Control<FieldValues>;
}

// List of scalar values (ADR 018), e.g. a tag list. Free-text entry; bound to a
// single value key.
export function ListOfScalarsBlockView({
  block,
  control,
}: ListOfScalarsBlockViewProps) {
  return (
    <Stack spacing={2}>
      {block.sectionLabel !== undefined && (
        <Typography color="text.secondary" variant="subtitle2">
          {block.sectionLabel}
        </Typography>
      )}
      <Controller
        control={control}
        name={block.name}
        render={({ field }) => {
          const value: readonly string[] = Array.isArray(field.value)
            ? (field.value as readonly string[])
            : [];
          return (
            <Autocomplete<string, true, false, true>
              freeSolo
              multiple
              options={[]}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={block.label}
                  placeholder={block.placeholder}
                  size="small"
                />
              )}
              renderValue={(tagValue, getItemProps) =>
                tagValue.map((option, index) => {
                  const { key, ...rest } = getItemProps({ index });
                  return (
                    <Chip key={key} {...rest} label={option} size="small" />
                  );
                })
              }
              value={[...value]}
              onChange={(_event, next) => field.onChange(next)}
            />
          );
        }}
      />
    </Stack>
  );
}
