// A field, and each member of a known set, is specified as either a bare name or
// an object carrying the name plus optional validation (ADR 018). The same shape
// serves fixed fields and property-bag members.
export type FieldSpec =
  | { readonly name: string; readonly validation?: FieldValidation }
  | string;

// Closed structural validation vocabulary (ADR 018). Exactly these keys — adding
// a sixth requires a real third case and an ADR amendment (R-WORK-7). The exact
// key set is what lets the type system reject unknown validation keys.
export interface FieldValidation {
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
