import type {
  EntityField,
  TechnologyEntity,
  TechnologyFolder,
  TechnologyPath,
} from '@contracts';
import type {
  AssignmentNode,
  BlockChild,
  BlockNode,
  ParadoxValue,
  Script,
} from '@paradox-parser';

const TECHNOLOGIES_BLOCK = 'technologies';
const PATH_BLOCK = 'path';
const FOLDER_BLOCK = 'folder';
const POSITION_BLOCK = 'position';

// Modeled scalar surfaces, in render order (semantic, not alphabetical —
// R-CODE-9 carve-out). Keys outside these sets stay verbatim in the lossless
// node and are never projected (R-CODE-5).
const ROOT_KEYS: readonly string[] = [
  'research_cost',
  'start_year',
  'doctrine',
  'doctrine_name',
  'show_equipment_icon',
];
const PATH_KEYS: readonly string[] = ['leads_to_tech', 'research_cost_coeff'];
const FOLDER_KEYS: readonly string[] = ['name'];
const POSITION_KEYS: readonly string[] = ['x', 'y'];

// Bare-token ref-lists (cross-entity free-text items).
const REF_LISTS = {
  categories: 'categories',
  dependencies: 'dependencies',
  enableEquipmentModules: 'enable_equipment_modules',
  enableEquipments: 'enable_equipments',
  enableSubunits: 'enable_subunits',
  xor: 'xor',
} as const;

export function extractTechnologies(
  parsedTarget: Script,
): readonly TechnologyEntity[] {
  const entities: TechnologyEntity[] = [];
  for (const child of parsedTarget.children) {
    if (
      child.kind !== 'Assignment' ||
      keyName(child) !== TECHNOLOGIES_BLOCK ||
      child.value.kind !== 'Block'
    ) {
      continue;
    }
    for (const entry of child.value.children) {
      if (entry.kind !== 'Assignment' || entry.value.kind !== 'Block') {
        continue;
      }
      const block = entry.value;
      entities.push({
        categories: tokenList(block, REF_LISTS.categories),
        dependencies: tokenList(block, REF_LISTS.dependencies),
        enableEquipmentModules: tokenList(
          block,
          REF_LISTS.enableEquipmentModules,
        ),
        enableEquipments: tokenList(block, REF_LISTS.enableEquipments),
        enableSubunits: tokenList(block, REF_LISTS.enableSubunits),
        folders: folderBlocks(block),
        paths: pathBlocks(block),
        rootScalars: scalarLeaves(block, ROOT_KEYS),
        token: keyName(entry),
        xor: tokenList(block, REF_LISTS.xor),
      });
    }
  }
  return entities;
}

function findBlock(block: BlockNode, key: string): BlockNode | undefined {
  for (const child of block.children) {
    if (
      child.kind === 'Assignment' &&
      child.value.kind === 'Block' &&
      keyName(child) === key
    ) {
      return child.value;
    }
  }
  return undefined;
}

function folderBlocks(block: BlockNode): readonly TechnologyFolder[] {
  const folders: TechnologyFolder[] = [];
  for (const child of block.children) {
    if (child.kind !== 'Assignment' || child.value.kind !== 'Block') continue;
    if (keyName(child) !== FOLDER_BLOCK) continue;
    const position = findBlock(child.value, POSITION_BLOCK);
    folders.push({
      position:
        position === undefined ? [] : scalarLeaves(position, POSITION_KEYS),
      scalars: scalarLeaves(child.value, FOLDER_KEYS),
    });
  }
  return folders;
}

function keyName(assignment: AssignmentNode): string {
  return assignment.key.kind === 'Identifier'
    ? assignment.key.name
    : assignment.key.value;
}

function pathBlocks(block: BlockNode): readonly TechnologyPath[] {
  const paths: TechnologyPath[] = [];
  for (const child of block.children) {
    if (child.kind !== 'Assignment' || child.value.kind !== 'Block') continue;
    if (keyName(child) !== PATH_BLOCK) continue;
    paths.push({ scalars: scalarLeaves(child.value, PATH_KEYS) });
  }
  return paths;
}

// Scalar values keep their raw source token (quotes included) so a save writes
// them back byte-identically through the verbatim `key = value` path.
function rawValueOf(value: ParadoxValue): string | undefined {
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
      return value.raw;
    default:
      return undefined;
  }
}

// The block's scalar leaves restricted to the modeled keys, in modeled order.
function scalarLeaves(
  block: BlockNode,
  keys: readonly string[],
): readonly EntityField[] {
  const byKey = new Map<string, string>();
  for (const child of block.children) {
    if (child.kind !== 'Assignment' || child.value.kind === 'Block') continue;
    const value = rawValueOf(child.value);
    if (value !== undefined && !byKey.has(keyName(child))) {
      byKey.set(keyName(child), value);
    }
  }
  const fields: EntityField[] = [];
  for (const key of keys) {
    const value = byKey.get(key);
    if (value !== undefined) fields.push({ key, value });
  }
  return fields;
}

function tokenList(block: BlockNode, key: string): readonly string[] {
  const list = findBlock(block, key);
  if (list === undefined) return [];
  const tokens: string[] = [];
  for (const child of list.children) {
    const token = tokenOf(child);
    if (token !== undefined) tokens.push(token);
  }
  return tokens;
}

function tokenOf(node: BlockChild): string | undefined {
  switch (node.kind) {
    case 'BooleanValue':
      return node.value ? 'yes' : 'no';
    case 'DateValue':
      return node.raw;
    case 'Identifier':
      return node.name;
    case 'NumberValue':
      return node.raw;
    case 'StringValue':
      return node.value;
    default:
      return undefined;
  }
}
