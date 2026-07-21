import type {
  EquipmentClassification,
  EquipmentDomain,
  EquipmentEntity,
  EquipmentKind,
  EquipmentScalar,
} from '@contracts';
import type {
  AssignmentNode,
  BlockChild,
  BlockNode,
  ParadoxValue,
  Script,
} from '@paradox-parser';

import { isSymbolDefinition } from '@paradox-parser';

import { INTERFACE_CATEGORY_DOMAIN } from './interface-category-domain.const';

// Identity- and classification-bearing keys the extractor already reads. Hoisted
// to constants so the scalar projection excludes exactly these without restating
// the literals.
const KEY_ARCHETYPE = 'archetype';
const KEY_INTERFACE_CATEGORY = 'interface_category';
const KEY_IS_ARCHETYPE = 'is_archetype';
const KEY_TYPE = 'type';

export function extractEquipment(
  parsedTarget: Script,
  archetypeIndex: ReadonlyMap<string, readonly string[]>,
): readonly EquipmentEntity[] {
  const entities: EquipmentEntity[] = [];
  for (const child of parsedTarget.children) {
    if (
      child.kind !== 'Assignment' ||
      keyName(child) !== 'equipments' ||
      child.value.kind !== 'Block'
    ) {
      continue;
    }
    for (const entry of child.value.children) {
      if (entry.kind !== 'Assignment') {
        continue;
      }
      const block = entry.value.kind === 'Block' ? entry.value : undefined;
      const kind = entityKind(block);
      entities.push({
        classification: classify(kind, block, archetypeIndex),
        kind,
        name: keyName(entry),
        node: entry,
        scalars: entityScalars(entry, block),
      });
    }
  }
  return entities;
}

function archetypeRef(block: BlockNode): string | undefined {
  const assignment = findAssignment(block, KEY_ARCHETYPE);
  return assignment === undefined ? undefined : tokenOf(assignment.value);
}

// Domain comes from the block's own `interface_category` (ADR 017); the `type`
// tokens it once derived from now populate only the classified `type` field. A
// block whose interface_category is absent or unmapped yields no domain:
//   - an archetype falls to the no-domain/invalid branch, reusing
//     `archetype-missing-type` (the archetype carries no determinable domain);
//   - a variant carries no interface_category of its own and so does not
//     classify here — archetype-domain inheritance is a cross-entity resolution
//     this single-block extractor does not perform (ADR 017 rule 4, deferred).
function classify(
  kind: EquipmentKind,
  block: BlockNode | undefined,
  archetypeIndex: ReadonlyMap<string, readonly string[]>,
): EquipmentClassification {
  if (kind === 'archetype') {
    const types = block === undefined ? [] : typeTokens(block);
    const domain = block === undefined ? undefined : domainOf(block);
    return types.length === 0 || domain === undefined
      ? { reason: 'archetype-missing-type', status: 'invalid' }
      : { domain, status: 'classified', type: types };
  }
  const ref = block === undefined ? undefined : archetypeRef(block);
  if (ref === undefined) {
    return { reason: 'regular-ref-not-typed', status: 'invalid' };
  }
  const resolved = archetypeIndex.get(ref);
  if (resolved === undefined) {
    return { archetypeRef: ref, status: 'unresolved' };
  }
  const domain = block === undefined ? undefined : domainOf(block);
  return resolved.length === 0 || domain === undefined
    ? { reason: 'regular-ref-not-typed', status: 'invalid' }
    : { domain, status: 'classified', type: resolved };
}

function domainOf(block: BlockNode): EquipmentDomain | undefined {
  const category = interfaceCategory(block);
  return category !== undefined &&
    Object.hasOwn(INTERFACE_CATEGORY_DOMAIN, category)
    ? INTERFACE_CATEGORY_DOMAIN[
        category as keyof typeof INTERFACE_CATEGORY_DOMAIN
      ]
    : undefined;
}

function entityKind(block: BlockNode | undefined): EquipmentKind {
  if (block === undefined) {
    return 'regular';
  }
  const flag = findAssignment(block, KEY_IS_ARCHETYPE);
  return flag !== undefined && isAffirmative(flag.value)
    ? 'archetype'
    : 'regular';
}

function entityScalars(
  entry: AssignmentNode,
  block: BlockNode | undefined,
): readonly EquipmentScalar[] {
  if (block === undefined) {
    return [];
  }
  const excluded = new Set<string>([
    KEY_ARCHETYPE,
    KEY_IS_ARCHETYPE,
    KEY_TYPE,
    keyName(entry),
  ]);
  const scalars: EquipmentScalar[] = [];
  for (const child of block.children) {
    // A definition is a declaration, never a scalar row (ADR 022, decision 7);
    // `EquipmentScalar` has no `symbol` slot, so it resolves the value only.
    if (
      child.kind !== 'Assignment' ||
      isSymbolDefinition(child) ||
      excluded.has(keyName(child))
    ) {
      continue;
    }
    const value = scalarValueOf(child.value);
    if (value !== undefined) {
      scalars.push({ key: keyName(child), value });
    }
  }
  return scalars;
}

function findAssignment(
  block: BlockNode,
  key: string,
): AssignmentNode | undefined {
  for (const child of block.children) {
    // A definition must not satisfy a modeled-key lookup (ADR 022, decision 7).
    if (
      child.kind === 'Assignment' &&
      !isSymbolDefinition(child) &&
      keyName(child) === key
    ) {
      return child;
    }
  }
  return undefined;
}

function interfaceCategory(block: BlockNode): string | undefined {
  const assignment = findAssignment(block, KEY_INTERFACE_CATEGORY);
  return assignment === undefined ? undefined : tokenOf(assignment.value);
}

function isAffirmative(value: ParadoxValue): boolean {
  return value.kind === 'BooleanValue' ? value.value : tokenOf(value) === 'yes';
}

function keyName(assignment: AssignmentNode): string {
  return assignment.key.kind === 'StringValue'
    ? assignment.key.value
    : assignment.key.name;
}

// `EquipmentScalar` (unlike `EntityField`) carries no `symbol` slot and its
// contract is out of scope here (ADR 022 touches only `EntityField`), so a
// `@NAME` reference resolves to its literal value with no symbolic origin
// recorded — the resolved value is still correct, never the sigil-stripped name.
function scalarValueOf(value: ParadoxValue): string | undefined {
  switch (value.kind) {
    case 'BooleanValue':
      return value.value ? 'yes' : 'no';
    case 'DateValue':
      return value.raw;
    case 'Identifier':
      return value.name;
    case 'NumberValue':
      return value.raw;
    case 'StringValue':
      return value.value;
    case 'SymbolValue':
      return value.resolved ?? `@${value.name}`;
    default:
      return undefined;
  }
}

function tokenOf(node: BlockChild): string | undefined {
  if (node.kind === 'Identifier') {
    return node.name;
  }
  if (node.kind === 'StringValue') {
    return node.value;
  }
  if (node.kind === 'SymbolValue') {
    return node.resolved ?? `@${node.name}`;
  }
  return undefined;
}

function typeTokens(block: BlockNode): readonly string[] {
  const assignment = findAssignment(block, KEY_TYPE);
  if (assignment === undefined) {
    return [];
  }
  if (assignment.value.kind === 'Block') {
    const tokens: string[] = [];
    for (const child of assignment.value.children) {
      const token = tokenOf(child);
      if (token !== undefined) {
        tokens.push(token);
      }
    }
    return tokens;
  }
  const token = tokenOf(assignment.value);
  return token === undefined ? [] : [token];
}
