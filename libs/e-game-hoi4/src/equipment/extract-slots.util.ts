import type { EntityField, EquipmentSlotsResult, ModuleSlot } from '@contracts';
import type {
  AssignmentNode,
  BlockChild,
  BlockNode,
  ParadoxValue,
} from '@paradox-parser';

import { isSymbolDefinition } from '@paradox-parser';

const KEY_ALLOWED_CATEGORIES = 'allowed_module_categories';
const KEY_DEFAULT_MODULES = 'default_modules';
const KEY_MODULE_SLOTS = 'module_slots';
const KEY_REQUIRED = 'required';

export function extractSlots(archetype: BlockNode): EquipmentSlotsResult {
  return {
    assignments: defaultModules(archetype),
    slots: moduleSlots(archetype),
  };
}

function allowedCategories(slot: BlockNode): readonly string[] {
  const assignment = findAssignment(slot, KEY_ALLOWED_CATEGORIES);
  if (assignment === undefined || assignment.value.kind !== 'Block') {
    return [];
  }
  const categories: string[] = [];
  for (const child of assignment.value.children) {
    const token = tokenOf(child);
    if (token !== undefined) {
      categories.push(token);
    }
  }
  return categories;
}

function defaultModules(archetype: BlockNode): readonly EntityField[] {
  const assignment = findAssignment(archetype, KEY_DEFAULT_MODULES);
  if (assignment === undefined || assignment.value.kind !== 'Block') {
    return [];
  }
  const fields: EntityField[] = [];
  for (const child of assignment.value.children) {
    if (child.kind !== 'Assignment') {
      continue;
    }
    const field = fieldOf(child);
    if (field !== undefined) {
      fields.push(field);
    }
  }
  return fields;
}

// The single scalar-leaf projection point: a definition is never a field (ADR
// 022, decision 7 — the skip lives here so every reader inherits it), a `@NAME`
// reference lowers to its resolved literal carrying its symbolic origin, and any
// other scalar maps to a plain field.
function fieldOf(child: AssignmentNode): EntityField | undefined {
  if (isSymbolDefinition(child)) return undefined;
  const value = child.value;
  const raw = scalarValueOf(value);
  if (raw === undefined) return undefined;
  const key = keyName(child);
  return value.kind === 'SymbolValue'
    ? { key, symbol: { name: value.name }, value: raw }
    : { key, value: raw };
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

function isAffirmative(value: ParadoxValue): boolean {
  return value.kind === 'BooleanValue' ? value.value : tokenOf(value) === 'yes';
}

function keyName(assignment: AssignmentNode): string {
  return assignment.key.kind === 'StringValue'
    ? assignment.key.value
    : assignment.key.name;
}

function moduleSlots(archetype: BlockNode): readonly ModuleSlot[] {
  const assignment = findAssignment(archetype, KEY_MODULE_SLOTS);
  if (assignment === undefined || assignment.value.kind !== 'Block') {
    return [];
  }
  const slots: ModuleSlot[] = [];
  for (const child of assignment.value.children) {
    if (child.kind !== 'Assignment') {
      continue;
    }
    const slot = child.value.kind === 'Block' ? child.value : undefined;
    slots.push({
      allowedCategories: slot === undefined ? [] : allowedCategories(slot),
      name: keyName(child),
      required: slot !== undefined && requiredFlag(slot),
    });
  }
  return slots;
}

function requiredFlag(slot: BlockNode): boolean {
  const assignment = findAssignment(slot, KEY_REQUIRED);
  return assignment !== undefined && isAffirmative(assignment.value);
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
