export const FIELD_VALUE_TYPES = {
  boolean: 'boolean',
  number: 'number',
  string: 'string',
} as const satisfies Record<string, string>;

export type FieldValueType = (typeof FIELD_VALUE_TYPES)[keyof typeof FIELD_VALUE_TYPES];

export interface FieldValidation {
  readonly enum?: readonly string[];
  readonly max?: number;
  readonly min?: number;
  readonly pattern?: string;
  readonly required?: boolean;
  readonly type?: FieldValueType;
}

export interface FieldSpec {
  readonly name: string;
  readonly validation?: FieldValidation;
}
