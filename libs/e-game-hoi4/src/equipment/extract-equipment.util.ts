import type {
  EquipmentClassification,
  EquipmentDomain,
  EquipmentEntity,
  EquipmentKind,
} from '@contracts';
import type {
  AssignmentNode,
  BlockChild,
  BlockNode,
  ParadoxValue,
  Script,
} from '@paradox-parser';

import { EQUIPMENT_TYPE_DOMAIN } from './equipment-type-domain.const';

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
      });
    }
  }
  return entities;
}

function archetypeRef(block: BlockNode): string | undefined {
  const assignment = findAssignment(block, 'archetype');
  return assignment === undefined ? undefined : tokenOf(assignment.value);
}

function classify(
  kind: EquipmentKind,
  block: BlockNode | undefined,
  archetypeIndex: ReadonlyMap<string, readonly string[]>,
): EquipmentClassification {
  if (kind === 'archetype') {
    const types = block === undefined ? [] : typeTokens(block);
    return types.length === 0
      ? { reason: 'archetype-missing-type', status: 'invalid' }
      : classifyTokens(types);
  }
  const ref = block === undefined ? undefined : archetypeRef(block);
  if (ref === undefined) {
    return { reason: 'regular-ref-not-typed', status: 'invalid' };
  }
  const resolved = archetypeIndex.get(ref);
  if (resolved === undefined) {
    return { archetypeRef: ref, status: 'unresolved' };
  }
  return resolved.length === 0
    ? { reason: 'regular-ref-not-typed', status: 'invalid' }
    : classifyTokens(resolved);
}

function classifyTokens(types: readonly string[]): EquipmentClassification {
  const domains = new Set<EquipmentDomain>();
  for (const token of types) {
    const domain = domainOf(token);
    if (domain === undefined) {
      return { reason: 'unknown-type', status: 'invalid' };
    }
    domains.add(domain);
  }
  if (domains.size > 1) {
    return { reason: 'cross-domain-type', status: 'invalid' };
  }
  const [domain] = domains;
  return { domain, status: 'classified', type: types };
}

function domainOf(token: string): EquipmentDomain | undefined {
  return Object.hasOwn(EQUIPMENT_TYPE_DOMAIN, token)
    ? EQUIPMENT_TYPE_DOMAIN[token as keyof typeof EQUIPMENT_TYPE_DOMAIN]
    : undefined;
}

function entityKind(block: BlockNode | undefined): EquipmentKind {
  if (block === undefined) {
    return 'regular';
  }
  const flag = findAssignment(block, 'is_archetype');
  return flag !== undefined && isAffirmative(flag.value)
    ? 'archetype'
    : 'regular';
}

function findAssignment(
  block: BlockNode,
  key: string,
): AssignmentNode | undefined {
  for (const child of block.children) {
    if (child.kind === 'Assignment' && keyName(child) === key) {
      return child;
    }
  }
  return undefined;
}

function isAffirmative(value: ParadoxValue): boolean {
  return value.kind === 'BooleanValue' ? value.value : tokenOf(value) === 'yes';
}

function keyName(assignment: AssignmentNode): string {
  return assignment.key.kind === 'Identifier'
    ? assignment.key.name
    : assignment.key.value;
}

function tokenOf(node: BlockChild): string | undefined {
  if (node.kind === 'Identifier') {
    return node.name;
  }
  if (node.kind === 'StringValue') {
    return node.value;
  }
  return undefined;
}

function typeTokens(block: BlockNode): readonly string[] {
  const assignment = findAssignment(block, 'type');
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
