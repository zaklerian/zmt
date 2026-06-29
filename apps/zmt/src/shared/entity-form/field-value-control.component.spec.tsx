import { render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { Control, FieldValues, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { FieldValueControl } from './field-value-control.component';

function Harness({
  defaults,
  name,
  validation,
}: {
  readonly defaults: FieldValues;
  readonly name: string;
  readonly validation: { enum?: readonly string[]; type?: 'boolean' };
}): ReactNode {
  const { control } = useForm<FieldValues>({ defaultValues: defaults });
  return (
    <FieldValueControl
      control={control as unknown as Control<FieldValues>}
      label="L"
      name={name}
      validation={validation}
    />
  );
}

describe('FieldValueControl select binding (ZMT-E14)', () => {
  it('an enum select shows its stored value on open', () => {
    render(
      <Harness
        defaults={{ priority: 'high' }}
        name="priority"
        validation={{ enum: ['low', 'high'] }}
      />,
    );
    expect(screen.getByRole('combobox')).toHaveTextContent('high');
  });

  it('a boolean select shows its stored yes/no token on open', () => {
    render(
      <Harness
        defaults={{ doctrine: 'yes' }}
        name="doctrine"
        validation={{ type: 'boolean' }}
      />,
    );
    expect(screen.getByRole('combobox')).toHaveTextContent('yes');
  });

  it('a boolean select reflects a coerced JS boolean as its yes/no token', () => {
    render(
      <Harness
        defaults={{ doctrine: true }}
        name="doctrine"
        validation={{ type: 'boolean' }}
      />,
    );
    expect(screen.getByRole('combobox')).toHaveTextContent('yes');
  });
});
