import { FieldSpec } from '@r-core';
import { describe, expect, it } from 'vitest';

import { lowerFieldSpec } from './field-spec-to-zod.util';

describe('lowerFieldSpec', () => {
  it('leaves a bare-name field unconstrained — empty and absent both pass', () => {
    const schema = lowerFieldSpec('gfx');
    expect(schema.safeParse('').success).toBe(true);
    expect(schema.safeParse(undefined).success).toBe(true);
    expect(schema.safeParse('value').success).toBe(true);
  });

  it('treats `required` as non-empty-when-present, not key-must-exist', () => {
    const spec: FieldSpec = { name: 'name', validation: { required: true } };
    const schema = lowerFieldSpec(spec, { required: 'Required' });

    // Absent value passes — required does not assert the key must exist.
    expect(schema.safeParse(undefined).success).toBe(true);
    // Present-but-empty value fails — that is what `required` constrains.
    expect(schema.safeParse('').success).toBe(false);
    // Present non-empty value passes.
    expect(schema.safeParse('hearts of iron').success).toBe(true);
  });

  it('enforces string min/max length bounds', () => {
    const schema = lowerFieldSpec({
      name: 'version',
      validation: { max: 5, min: 2 },
    });
    expect(schema.safeParse('a').success).toBe(false);
    expect(schema.safeParse('ab').success).toBe(true);
    expect(schema.safeParse('abcdef').success).toBe(false);
  });

  it('enforces a string pattern', () => {
    const schema = lowerFieldSpec({
      name: 'version',
      validation: { pattern: '^\\d+\\.\\d+$' },
    });
    expect(schema.safeParse('1.2').success).toBe(true);
    expect(schema.safeParse('nope').success).toBe(false);
  });

  it('accepts only in-set values for an enum field, passing absent and empty', () => {
    const schema = lowerFieldSpec(
      { name: 'gender', validation: { enum: ['male', 'female'] } },
      { invalid: 'Invalid' },
    );

    expect(schema.safeParse('male').success).toBe(true);
    expect(schema.safeParse('female').success).toBe(true);
    // Out-of-set value fails the closed set.
    expect(schema.safeParse('other').success).toBe(false);
    // Absent / empty pass — an enum does not assert the key must exist.
    expect(schema.safeParse(undefined).success).toBe(true);
    expect(schema.safeParse('').success).toBe(true);
  });

  it('coerces and bounds a number-typed field', () => {
    const schema = lowerFieldSpec({
      name: 'weight',
      validation: { max: 10, min: 1, type: 'number' },
    });
    expect(schema.safeParse('5').success).toBe(true);
    expect(schema.safeParse('0').success).toBe(false);
    expect(schema.safeParse('11').success).toBe(false);
  });
});
