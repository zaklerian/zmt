// A single editable key→value row inside a scalar bag. The bag's diff input and
// the form field-array element share this shape.
export interface ScalarRow {
  readonly key: string;
  readonly value: string;
}
