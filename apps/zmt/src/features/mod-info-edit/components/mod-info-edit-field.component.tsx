import { Autocomplete, Chip, TextField } from '@mui/material';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

interface ModInfoEditTagsFieldProps {
  label: string;
  name: string;
}

interface ModInfoEditTextFieldProps {
  label: string;
  name: string;
}

export function ModInfoEditTagsField({
  label,
  name,
}: ModInfoEditTagsFieldProps) {
  const { t } = useTranslation(['feature.modInfoEdit']);
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={name}
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
                label={label}
                placeholder={t(
                  'feature.modInfoEdit:form.fields.tags.placeholder',
                )}
                size="small"
              />
            )}
            renderValue={(tagValue, getItemProps) =>
              tagValue.map((option, index) => {
                const { key, ...rest } = getItemProps({ index });
                return <Chip key={key} {...rest} label={option} size="small" />;
              })
            }
            value={[...value]}
            onChange={(_event, next) => field.onChange(next)}
          />
        );
      }}
    />
  );
}

export function ModInfoEditTextField({
  label,
  name,
}: ModInfoEditTextFieldProps) {
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          error={fieldState.error !== undefined}
          fullWidth
          helperText={fieldState.error?.message}
          label={label}
          size="small"
          value={typeof field.value === 'string' ? field.value : ''}
        />
      )}
    />
  );
}
