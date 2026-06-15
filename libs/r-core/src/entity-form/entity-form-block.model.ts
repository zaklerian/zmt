import { FieldSpec } from './field-spec.model';

export type EntityFormBlock =
  | ListOfScalarsBlock
  | NamedNestedBlock
  | PropertyBagBlock;

// A fixed, named scalar field rendered by the property-bag block in fixed mode.
// `label` is resolved by the descriptor (game-specific); the shell renders it
// verbatim. `readonly` fields render disabled (e.g. an entity's `name`).
export interface EntityFormFixedField {
  readonly label: string;
  readonly readonly?: boolean;
  readonly spec: FieldSpec;
  readonly value: string;
}

// One editable key→value row inside a property-bag / named-nested block.
export interface EntityFormRow {
  readonly key: string;
  readonly value: string;
}

// Write scope per the ADR 019 scoped-delta contract: null targets the entity's
// own scalars (root); a string names a direct child block (named-child).
export type EntityWriteScope = null | string;

// A list of scalar values (e.g. tags), bound to one value key.
export interface ListOfScalarsBlock extends BlockCommon {
  readonly kind: 'listOfScalars';
  readonly label: string;
  readonly name: string;
  readonly placeholder?: string;
  readonly values: readonly string[];
}

// One level deep named child rendered as a key→scalar map. Reuses the
// property-bag open rendering (ADR 018 point 3); `scope` carries the child
// block name so the descriptor's save can target it.
export interface NamedNestedBlock extends BlockCommon {
  readonly kind: 'namedNested';
  readonly knownKeys: readonly string[];
  readonly name: string;
  readonly rows: readonly EntityFormRow[];
}

// Scalar / property bag. Two facets share the FieldSpec shape (ADR 018 point 4):
// `open` is a free key→value bag (combobox keys + add/remove, bound to one
// field-array `name`); `fixed` is a closed set of named scalar fields, each
// bound to a root value key = its field name.
export interface PropertyBagBlock extends BlockCommon {
  readonly kind: 'propertyBag';
  readonly members:
    | {
        readonly fields: readonly EntityFormFixedField[];
        readonly mode: 'fixed';
      }
    | {
        readonly knownKeys: readonly string[];
        readonly mode: 'open';
        readonly name: string;
        readonly rows: readonly EntityFormRow[];
      };
}

interface BlockCommon {
  readonly scope: EntityWriteScope;
  // Pre-resolved section heading (game-specific). Absent → no heading.
  readonly sectionLabel?: string;
}
