import type {
  EntityField,
  ModuleDomain,
  ModuleEntity,
  ModuleStatBlocks,
} from '@contracts';
import type {
  AssignmentNode,
  BlockChild,
  BlockNode,
  ParadoxValue,
  Script,
} from '@paradox-parser';

import { MODULE_CATEGORY_DOMAIN } from './module-category-domain.const';

// The classifier input, surfaced read-only on the entity and excluded from the
// scalar projection.
const KEY_CATEGORY = 'category';

export function extractModules(parsedTarget: Script): readonly ModuleEntity[] {
  const entities: ModuleEntity[] = [];
  for (const child of parsedTarget.children) {
    if (
      child.kind !== 'Assignment' ||
      keyName(child) !== 'equipment_modules' ||
      child.value.kind !== 'Block'
    ) {
      continue;
    }
    for (const entry of child.value.children) {
      if (entry.kind !== 'Assignment' || entry.value.kind !== 'Block') {
        continue;
      }
      const block = entry.value;
      const category = moduleCategory(block);
      entities.push({
        category,
        domain: domainOf(category),
        name: keyName(entry),
        node: entry,
        scalars: moduleScalars(entry, block),
        statBlocks: moduleStatBlocks(block),
      });
    }
  }
  return entities;
}

function domainOf(category: string): ModuleDomain {
  return Object.hasOwn(MODULE_CATEGORY_DOMAIN, category)
    ? MODULE_CATEGORY_DOMAIN[category as keyof typeof MODULE_CATEGORY_DOMAIN]
    : 'unclassified';
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

function keyName(assignment: AssignmentNode): string {
  return assignment.key.kind === 'Identifier'
    ? assignment.key.name
    : assignment.key.value;
}

function moduleCategory(block: BlockNode): string {
  const assignment = findAssignment(block, KEY_CATEGORY);
  return assignment === undefined ? '' : (tokenOf(assignment.value) ?? '');
}

function moduleScalars(
  entry: AssignmentNode,
  block: BlockNode,
): readonly EntityField[] {
  const excluded = new Set<string>([KEY_CATEGORY, keyName(entry)]);
  const fields: EntityField[] = [];
  for (const child of block.children) {
    if (child.kind !== 'Assignment' || excluded.has(keyName(child))) {
      continue;
    }
    const value = scalarValueOf(child.value);
    if (value !== undefined) {
      fields.push({ key: keyName(child), value });
    }
  }
  return fields;
}

function moduleStatBlocks(block: BlockNode): ModuleStatBlocks {
  return {
    add_average_stats: statFields(block, 'add_average_stats'),
    add_stats: statFields(block, 'add_stats'),
    multiply_stats: statFields(block, 'multiply_stats'),
  };
}

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
    default:
      return undefined;
  }
}

function statFields(block: BlockNode, key: string): readonly EntityField[] {
  const assignment = findAssignment(block, key);
  if (assignment === undefined || assignment.value.kind !== 'Block') {
    return [];
  }
  const fields: EntityField[] = [];
  for (const child of assignment.value.children) {
    if (child.kind !== 'Assignment') {
      continue;
    }
    const value = scalarValueOf(child.value);
    if (value !== undefined) {
      fields.push({ key: keyName(child), value });
    }
  }
  return fields;
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
