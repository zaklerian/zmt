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
}

export type EquipmentInvalidReason =
  | 'archetype-missing-type'
  | 'cross-domain-type'
  | 'regular-ref-not-typed'
  | 'unknown-type';

export type EquipmentKind = 'archetype' | 'regular';
