import { FieldSpec, fieldValidation, FieldValidation } from '@r-core';
import { z } from 'zod';

import { BOOLEAN_OPTIONS } from './boolean-options.const';

export interface FieldSpecMessages {
  // Type / bounds / pattern violation.
  readonly invalid?: string;
  // Non-empty-when-present (`required`) violation.
  readonly required?: string;
}

// Lowers a single field spec to a Zod fragment for the field's value (ADR 018
// point 4). A bare name carries no constraint. `required` lowers to a
// non-empty-when-present refinement, NOT a required key: an absent value always
// passes, only a present-but-empty value fails. `type` selects the primitive,
// `min`/`max` bound it, `pattern` constrains a string. The closed validation
// vocabulary is enforced at the type level by FieldValidation's exact key set.
export function lowerFieldSpec(
  spec: FieldSpec,
  messages: FieldSpecMessages = {},
): z.ZodTypeAny {
  const validation = fieldValidation(spec);
  if (validation === undefined) return z.string().optional();
  return lowerValidation(validation, messages);
}

function lowerValidation(
  validation: FieldValidation,
  messages: FieldSpecMessages,
): z.ZodTypeAny {
  const {
    enum: allowed,
    max,
    min,
    pattern,
    required,
    type = 'string',
  } = validation;

  // A closed set: a present non-empty value must be in the set; an absent or
  // empty value passes (editing existing files that omit optional keys). The
  // preprocess maps '' → undefined so the enum check only sees real values. A
  // `type: boolean` field is the closed yes/no token set: it keeps its string
  // token rather than coercing to a JS boolean, which would neither match a
  // select option nor survive the string-keyed save delta (ZMT-E14).
  const closedSet =
    allowed ?? (type === 'boolean' ? BOOLEAN_OPTIONS : undefined);
  if (closedSet !== undefined && closedSet.length > 0) {
    return z.preprocess(
      (value) => (value === '' ? undefined : value),
      z
        .enum([...closedSet] as [string, ...string[]], {
          message: messages.invalid,
        })
        .optional(),
    );
  }

  if (type === 'number') {
    let schema = z.coerce.number({ message: messages.invalid });
    if (min !== undefined) schema = schema.min(min, messages.invalid);
    if (max !== undefined) schema = schema.max(max, messages.invalid);
    return schema.optional();
  }

  let schema = z.string();
  if (min !== undefined) schema = schema.min(min, messages.invalid);
  if (max !== undefined) schema = schema.max(max, messages.invalid);
  if (pattern !== undefined) {
    schema = schema.regex(new RegExp(pattern), messages.invalid);
  }
  // Non-empty-when-present: the present value must be non-empty; absence is
  // allowed by the trailing `.optional()`.
  if (required === true) schema = schema.min(1, messages.required);
  return schema.optional();
}
