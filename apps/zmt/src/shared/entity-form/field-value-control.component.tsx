import { MenuItem, TextField } from '@mui/material';
import { FieldValidation } from '@r-core';
import { Control, Controller, FieldValues } from 'react-hook-form';

interface FieldValueControlProps {
  readonly control: Control<FieldValues>;
  readonly disabled?: boolean;
  readonly fullWidth?: boolean;
  readonly label?: string;
  readonly name: string;
  readonly validation?: FieldValidation;
}

// HOI4 booleans are the bare `yes` / `no` tokens; rendered raw, like a property
// key, since they are intrinsic file tokens rather than UI chrome.
const BOOLEAN_OPTIONS: readonly string[] = ['yes', 'no'];

// One scalar value control (ADR 018, extended ZMT-13). An `enum` field renders a
// closed select over its allowed values (no free-text); a `type: boolean` field
// renders a yes/no select; everything else is a free-text input. Closed-set
// option labels are the intrinsic tokens themselves, shown raw like keys.
// Controlled by the shell's RHF control (A-REACT-1).
export function FieldValueControl({
  control,
  disabled,
  fullWidth,
  label,
  name,
  validation,
}: FieldValueControlProps) {
  const options =
    validation?.enum !== undefined
      ? validation.enum
      : validation?.type === 'boolean'
        ? BOOLEAN_OPTIONS
        : null;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          disabled={disabled === true}
          error={fieldState.error !== undefined}
          fullWidth={fullWidth === true}
          helperText={fieldState.error?.message}
          label={label}
          select={options !== null}
          size="small"
          value={typeof field.value === 'string' ? field.value : ''}
        >
          {options?.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  );
}
