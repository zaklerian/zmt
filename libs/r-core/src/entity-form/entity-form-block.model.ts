import { FieldSpec } from './field-spec.model';

export type EntityFormBlock =
  | ListOfScalarsBlock
  | NamedNestedBlock
  | PropertyBagBlock;

// A fixed, named scalar field rendered by the property-bag block in fixed mode.
// `label` is resolved by the descriptor (game-specific); the shell renders it
// verbatim. `readonly` fields render disabled (e.g. an entity's `name`). The
// field's `spec` validation drives the control: an `enum` renders a closed
// select, `type: boolean` a yes/no select, otherwise a text input.
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

// Write scope per the ADR 019 scoped-delta contract (amended ZMT-13): null or an
// empty path targets the entity's own scalars (root); each element descends one
// named child block, so a two-element path reaches a grandchild (e.g.
// `['portraits', 'army']`). Bounded by the form layer's two-level nesting cap.
export type EntityWriteScope = null | readonly string[];

// A list of scalar values (e.g. a role's `traits`), bound to one value key. Used
// both as a top-level block and as a named-nested block's list child.
export interface ListOfScalarsBlock extends BlockCommon {
  readonly kind: 'listOfScalars';
  readonly label: string;
  readonly name: string;
  readonly placeholder?: string;
  readonly values: readonly string[];
}

// One level deep named child rendered as a key→scalar map (ADR 018, extended
// ZMT-13). `scope` carries the child block path so the descriptor's save can
// target it. Beyond its own `rows`, a named block may host `listChildren`
// (list-of-scalars, e.g. `traits`) and `namedChildren` (the bounded second
// nesting level, e.g. `portraits`'s `army`/`civilian`/`navy`); each child binds
// flat under its own name. `knownKeys` may carry per-key validation so a known
// key renders a closed/yes-no select.
export interface NamedNestedBlock extends BlockCommon {
  readonly kind: 'namedNested';
  readonly knownKeys: readonly FieldSpec[];
  readonly listChildren?: readonly ListOfScalarsBlock[];
  readonly name: string;
  readonly namedChildren?: readonly NamedScalarChild[];
  readonly rows: readonly EntityFormRow[];
}

// A named child whose leaves are scalars — the one bounded extra nesting level
// (ADR 018, extended ZMT-13), e.g. `portraits → army → large`. Same key→scalar
// shape as a NamedNestedBlock's rows, but it carries no children of its own: the
// absent children facets are what cap nesting at two levels in the type itself.
export interface NamedScalarChild {
  readonly knownKeys: readonly FieldSpec[];
  readonly name: string;
  readonly rows: readonly EntityFormRow[];
  readonly scope: EntityWriteScope;
  readonly sectionLabel?: string;
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
        readonly knownKeys: readonly FieldSpec[];
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
