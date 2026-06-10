import type { AssignmentNode } from '@paradox-parser';

export type EquipmentClassification =
  | { readonly archetypeRef: string; readonly status: 'unresolved' }
  | {
      readonly domain: EquipmentDomain;
      readonly status: 'classified';
      readonly type: readonly string[];
    }
  | { readonly reason: EquipmentInvalidReason; readonly status: 'invalid' };

export type EquipmentDomain = 'air' | 'land' | 'naval';

export interface EquipmentEntity {
  readonly classification: EquipmentClassification;
  readonly kind: EquipmentKind;
  readonly name: string;
  // Lossless: the original parsed `name = { ... }` node, retained so a save can
  // round-trip fields the tool does not model. Kept as the parser's own mutable
  // shape; only the handle is readonly.
  readonly node: AssignmentNode;
  // Flat projection of the entity's own scalar leaf fields, excluding the
  // classification- and identity-bearing keys, so an edit form seeds editable
  // rows without re-deriving field structure. Nested blocks stay in `node`.
  readonly scalars: readonly EquipmentScalar[];
}

export type EquipmentInvalidReason =
  | 'archetype-missing-type'
  | 'cross-domain-type'
  | 'regular-ref-not-typed'
  | 'unknown-type';

export type EquipmentKind = 'archetype' | 'regular';

export interface EquipmentScalar {
  readonly key: string;
  readonly value: string;
}
