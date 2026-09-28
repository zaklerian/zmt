import type { FieldSpec } from './field-spec.model';

export const ENTITY_FORM_BLOCK_KINDS = {
  listOfScalars: 'listOfScalars',
  namedNested: 'namedNested',
  objectList: 'objectList',
  propertyBag: 'propertyBag',
} as const satisfies Record<string, string>;

export type EntityFormBlockKind =
  (typeof ENTITY_FORM_BLOCK_KINDS)[keyof typeof ENTITY_FORM_BLOCK_KINDS];

export type EntityScopeSegment = string | { readonly index: number; readonly name: string };

export type EntityWriteScope = null | readonly EntityScopeSegment[];

export interface EntityFormRow {
  readonly key: string;
  readonly value: null | string;
}

export interface EntityFormFixedField {
  readonly label: string;
  readonly readonly?: boolean;
  readonly spec: FieldSpec;
  readonly value: string;
}

export interface BlockCommon {
  readonly scope: EntityWriteScope;
  readonly sectionLabel?: string;
}

export type PropertyBagMembers =
  | { readonly fields: readonly EntityFormFixedField[]; readonly mode: 'fixed' }
  | {
      readonly knownKeys: readonly FieldSpec[];
      readonly mode: 'open';
      readonly name: string;
      readonly rows: readonly EntityFormRow[];
    };

export interface PropertyBagBlock extends BlockCommon {
  readonly kind: typeof ENTITY_FORM_BLOCK_KINDS.propertyBag;
  readonly members: PropertyBagMembers;
}

export interface ListOfScalarsBlock extends BlockCommon {
  readonly kind: typeof ENTITY_FORM_BLOCK_KINDS.listOfScalars;
  readonly label: string;
  readonly name: string;
  readonly placeholder?: string;
  readonly values: readonly string[];
}

export interface ObjectListField {
  readonly label: string;
  readonly spec: FieldSpec;
}

export interface ObjectListNested {
  readonly fields: readonly ObjectListField[];
  readonly name: string;
  readonly sectionLabel?: string;
}

export interface ObjectListBlock extends BlockCommon {
  readonly addLabel: string;
  readonly fields: readonly ObjectListField[];
  readonly itemLabel: string;
  readonly items: readonly Readonly<Record<string, unknown>>[];
  readonly kind: typeof ENTITY_FORM_BLOCK_KINDS.objectList;
  readonly name: string;
  readonly nested?: ObjectListNested;
}

export type KeyedMapEntryValue =
  | { readonly fields: readonly ObjectListField[]; readonly kind: 'fixedFields' }
  | { readonly kind: 'propertyBag'; readonly knownKeys: readonly FieldSpec[] };

export interface EditableKeyedMap {
  readonly addLabel: string;
  readonly entryValue: KeyedMapEntryValue;
  readonly keyLabel: string;
  readonly keyPlaceholder?: string;
}

export interface NamedScalarChild {
  readonly knownKeys: readonly FieldSpec[];
  readonly name: string;
  readonly rows: readonly EntityFormRow[];
  readonly scope: EntityWriteScope;
  readonly sectionLabel?: string;
}

export interface NamedNestedBlock extends BlockCommon {
  readonly editableKeyedMap?: EditableKeyedMap;
  readonly kind: typeof ENTITY_FORM_BLOCK_KINDS.namedNested;
  readonly knownKeys: readonly FieldSpec[];
  readonly listChildren?: readonly ListOfScalarsBlock[];
  readonly name: string;
  readonly namedChildren?: readonly NamedScalarChild[];
  readonly rows: readonly EntityFormRow[];
}

export type EntityFormBlock =
  ListOfScalarsBlock | NamedNestedBlock | ObjectListBlock | PropertyBagBlock;
