import { FieldSpec } from './field-spec.model';

// Per-item field carrying an object-list item's original block index — the
// position of its source block among the repeated same-name siblings — or null
// for an item added in the form. The save maps each surviving item back to its
// source block by this index so writes stay item-surgical across removals; a new
// item (null) materializes a fresh block (ADR 019, amended ZMT-14).
export const OBJECT_LIST_ITEM_INDEX_KEY = '__originalIndex';

export type EntityFormBlock =
  | ListOfScalarsBlock
  | NamedNestedBlock
  | ObjectListBlock
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

// One editable key→value row inside a property-bag / named-nested block. `value`
// mirrors the source `EntityField`, whose value is absent (`null`) only for a
// bare value-list token (A-TS-1). Form rows are always concrete `key = value`
// scalars — bare-token lists render through `ListOfScalarsBlock`, not here — so
// the RHF seam normalizes an absent value to the empty string.
export interface EntityFormRow {
  readonly key: string;
  readonly value: null | string;
}

// One step of a write scope path (ADR 019, amended ZMT-14). A bare string names
// the sole child block (unchanged); a `{ name, index }` segment selects the
// index-th sibling sharing `name` — the only form that addresses one of N
// repeated same-name blocks (an object-list item).
export type EntityScopeSegment =
  | { readonly index: number; readonly name: string }
  | string;

// Write scope per the ADR 019 scoped-delta contract (amended ZMT-13, ZMT-14):
// null or an empty path targets the entity's own scalars (root); each element
// descends one child block, so a two-element path reaches a grandchild (e.g.
// `['portraits', 'army']`, or `[{ name: 'folder', index: 1 }, 'position']`).
// Bounded by the form layer's two-level nesting cap.
export type EntityWriteScope = null | readonly EntityScopeSegment[];

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

// Object-list block (ADR 018, extended ZMT-14). A list of repeated same-named
// blocks (e.g. `path`), items positional and rendered as repeatable item cards
// with add/remove. `name` is both the repeated block name and the RHF field-array
// binding. Each item is the `fields` scalar field-specs, optionally plus ONE
// `nested` named-object (e.g. `folder`'s `position { x y }`) within the two-level
// cap. `items` carries the open-time item values (one record per item, scalar
// fields flat plus the nested object under `nested.name`); add/remove insert or
// delete one rendered block, addressed by the indexed scope segment (ADR 019).
export interface ObjectListBlock extends BlockCommon {
  readonly addLabel: string;
  readonly fields: readonly ObjectListField[];
  readonly itemLabel: string;
  readonly items: readonly Readonly<Record<string, unknown>>[];
  readonly kind: 'objectList';
  readonly name: string;
  readonly nested?: ObjectListNested;
}

// One scalar field of an object-list item. `label` is resolved by the descriptor;
// `spec` drives the value control (enum → closed select, boolean → yes/no select,
// otherwise free text), mirroring `EntityFormFixedField` without a per-item value.
export interface ObjectListField {
  readonly label: string;
  readonly spec: FieldSpec;
}

// The one optional nested named-object an object-list item may carry (e.g.
// `folder`'s `position`) — its own scalar fields, no deeper (two-level cap).
export interface ObjectListNested {
  readonly fields: readonly ObjectListField[];
  readonly name: string;
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
