import type {
  EntityField,
  ModuleCostMaps,
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

// Surfaced read-only on the entity and excluded from the scalar projection. A
// module's only relation to an archetype is its category matching a slot's
// allowed categories, checked by the slot designer — modules carry no domain.
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
        costMaps: moduleCostMaps(block),
        name: keyName(entry),
        node: entry,
        scalars: moduleScalars(entry, block),
        statBlocks: moduleStatBlocks(block),
      });
    }
  }
  return entities;
}

// A `@NAME` reference lowers to its resolved literal while carrying its symbolic
// origin on the field (ADR 022); other values map to a plain field.
function fieldOf(key: string, value: ParadoxValue): EntityField | undefined {
  const raw = scalarValueOf(value);
  if (raw === undefined) return undefined;
  return value.kind === 'SymbolValue'
    ? { key, symbol: { name: value.name }, value: raw }
    : { key, value: raw };
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
  return assignment.key.kind === 'StringValue'
    ? assignment.key.value
    : assignment.key.name;
}

function moduleCategory(block: BlockNode): string {
  const assignment = findAssignment(block, KEY_CATEGORY);
  return assignment === undefined ? '' : (tokenOf(assignment.value) ?? '');
}

function moduleCostMaps(block: BlockNode): ModuleCostMaps {
  return {
    build_cost_resources: nestedScalarFields(block, 'build_cost_resources'),
    dismantle_cost_resources: nestedScalarFields(
      block,
      'dismantle_cost_resources',
    ),
  };
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
    const field = fieldOf(keyName(child), child.value);
    if (field !== undefined) {
      fields.push(field);
    }
  }
  return fields;
}

function moduleStatBlocks(block: BlockNode): ModuleStatBlocks {
  return {
    add_average_stats: nestedScalarFields(block, 'add_average_stats'),
    add_stats: nestedScalarFields(block, 'add_stats'),
    multiply_stats: nestedScalarFields(block, 'multiply_stats'),
  };
}

// Projects a named nested block's scalar children into a flat field list, shared
// by the stat blocks and the cost maps (both flat key→scalar maps). An absent or
// non-block key yields an empty list.
function nestedScalarFields(
  block: BlockNode,
  key: string,
): readonly EntityField[] {
  const assignment = findAssignment(block, key);
  if (assignment === undefined || assignment.value.kind !== 'Block') {
    return [];
  }
  const fields: EntityField[] = [];
  for (const child of assignment.value.children) {
    if (child.kind !== 'Assignment') {
      continue;
    }
    const field = fieldOf(keyName(child), child.value);
    if (field !== undefined) {
      fields.push(field);
    }
  }
  return fields;
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
