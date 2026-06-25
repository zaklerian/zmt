import { MenuItem, TextField } from '@mui/material';
import { FieldValidation } from '@r-core';
import { Control, Controller, FieldValues } from 'react-hook-form';

import {
  BOOLEAN_FALSE,
  BOOLEAN_OPTIONS,
  BOOLEAN_TRUE,
} from './boolean-options.const';

interface FieldValueControlProps {
  readonly control: Control<FieldValues>;
  readonly disabled?: boolean;
  readonly fullWidth?: boolean;
  readonly label?: string;
  readonly name: string;
  readonly validation?: FieldValidation;
}

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
          value={selectedValue(field.value)}
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

// The controlled select's bound value. A stored string binds directly; a JS
// boolean (a value coerced upstream) maps to its yes/no token so the option still
// matches; anything else binds empty rather than silently blanking the control.
function selectedValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? BOOLEAN_TRUE : BOOLEAN_FALSE;
  return typeof value === 'string' ? value : '';
}
