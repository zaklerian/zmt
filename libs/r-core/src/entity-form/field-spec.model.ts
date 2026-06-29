// A field, and each member of a known set, is specified as either a bare name or
// an object carrying the name plus optional validation (ADR 018). The same shape
// serves fixed fields and property-bag members.
export type FieldSpec =
  | { readonly name: string; readonly validation?: FieldValidation }
  | string;

// Closed structural validation vocabulary (ADR 018, extended ZMT-13). The exact
// key set is what lets the type system reject unknown validation keys. A keyword
// is admitted when the need recurs by design and its shape is known and stable.
export interface FieldValidation {
  // A closed set of allowed string values, lowering to `z.enum([...])` and
  // rendered as a closed select that rejects out-of-set values. Distinct from a
  // property bag's known-key set, which is an open free-text suggestion list.
  // Applies only to intrinsic closed value sets — a small fixed vocabulary the
  // file's own schema defines, not a cross-entity reference.
  readonly enum?: readonly string[];
  readonly max?: number;
  readonly min?: number;
  readonly pattern?: string;
  // `required` means non-empty-when-present, NOT key-must-exist — editing
  // operates on existing files that legitimately omit optional keys.
  readonly required?: boolean;
  readonly type?: FieldValueType;
}

export type FieldValueType = 'boolean' | 'number' | 'string';

export function fieldName(spec: FieldSpec): string {
  return typeof spec === 'string' ? spec : spec.name;
}

export function fieldValidation(spec: FieldSpec): FieldValidation | undefined {
  return typeof spec === 'string' ? undefined : spec.validation;
}
