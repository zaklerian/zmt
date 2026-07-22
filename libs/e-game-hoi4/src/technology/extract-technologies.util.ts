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

import { isSymbolDefinition } from '@paradox-parser';

const TECHNOLOGIES_BLOCK = 'technologies';
const DEPENDENCIES_BLOCK = 'dependencies';
const PATH_BLOCK = 'path';
const FOLDER_BLOCK = 'folder';
const POSITION_BLOCK = 'position';
const SUB_TECHNOLOGIES_BLOCK = 'sub_technologies';
const XOR_BLOCK = 'xor';

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
const PATH_KEYS: readonly string[] = [
  'leads_to_tech',
  'research_cost_coeff',
  'ignore_for_layout',
];
const FOLDER_KEYS: readonly string[] = ['name'];
const POSITION_KEYS: readonly string[] = ['x', 'y'];

// Bare-token additive ref-lists (cross-entity free-text items). Every one is read
// across ALL repeated sibling blocks, not first-wins (survey #19 — BICE carries
// `enable_equipments` ×6 on a real tech). `sub_technologies` reads mechanically
// as a bare-token list, but is a distinct attached-node kind (see the model): the
// parent's list of child sub-tech tokens the engine attaches to it.
const REF_LISTS = {
  categories: 'categories',
  enableEquipmentModules: 'enable_equipment_modules',
  enableEquipments: 'enable_equipments',
  enableSubunits: 'enable_subunits',
  subTechnologies: SUB_TECHNOLOGIES_BLOCK,
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
        categories: refTokens(block, REF_LISTS.categories),
        dependencies: dependencyRefs(block),
        enableEquipmentModules: refTokens(
          block,
          REF_LISTS.enableEquipmentModules,
        ),
        enableEquipments: refTokens(block, REF_LISTS.enableEquipments),
        enableSubunits: refTokens(block, REF_LISTS.enableSubunits),
        folders: folderBlocks(block),
        paths: pathBlocks(block),
        rootScalars: scalarLeaves(block, ROOT_KEYS),
        subTechnologies: refTokens(block, REF_LISTS.subTechnologies),
        token: keyName(entry),
        xor: refTokens(block, XOR_BLOCK, true),
      });
    }
  }
  return entities;
}

// Every repeated same-named sibling block, in source order — the additive-block
// reader (`enable_equipments`/`dependencies` ×N). `caseInsensitive` folds the key
// for `XOR`, which the format treats case-insensitively (survey — BICE `XOR` ×7).
function blocksNamed(
  block: BlockNode,
  key: string,
  caseInsensitive = false,
): readonly BlockNode[] {
  const target = caseInsensitive ? key.toLowerCase() : key;
  const matches: BlockNode[] = [];
  for (const child of block.children) {
    if (child.kind !== 'Assignment' || child.value.kind !== 'Block') continue;
    const name = keyName(child);
    if ((caseInsensitive ? name.toLowerCase() : name) === target) {
      matches.push(child.value);
    }
  }
  return matches;
}

// The AND-prerequisite edge targets: every tech token across every repeated
// `dependencies` block, from both source forms — a bare token, and the
// `{ <tech> = 1 }` assignment form whose KEY is the target (dropped today because
// `tokenOf` reads only bare values — survey #19). A symbol definition is never a
// target (ADR 022 D7); a block-valued assignment is not a scalar edge and is left
// to surface as unmodeled rather than absorbed.
function dependencyRefs(block: BlockNode): readonly string[] {
  const refs: string[] = [];
  for (const list of blocksNamed(block, DEPENDENCIES_BLOCK)) {
    for (const child of list.children) {
      if (child.kind === 'Assignment') {
        if (isSymbolDefinition(child) || child.value.kind === 'Block') continue;
        refs.push(keyName(child));
      } else {
        const token = tokenOf(child);
        if (token !== undefined) refs.push(token);
      }
    }
  }
  return refs;
}

// The single scalar-leaf projection point: a definition is never a field (ADR
// 022, decision 7 — enforced here so every reader, fixed or open, inherits the
// skip), a `@NAME` reference lowers to its resolved literal carrying its symbolic
// origin, and any other scalar maps to a plain field.
function fieldOf(child: AssignmentNode): EntityField | undefined {
  if (isSymbolDefinition(child)) return undefined;
  const value = child.value;
  const raw = rawValueOf(value);
  if (raw === undefined) return undefined;
  const key = keyName(child);
  return value.kind === 'SymbolValue'
    ? { key, symbol: { name: value.name }, value: raw }
    : { key, value: raw };
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
  return assignment.key.kind === 'StringValue'
    ? assignment.key.value
    : assignment.key.name;
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
// them back byte-identically through the verbatim `key = value` path. A `@NAME`
// reference lowers to its RESOLVED literal (the symbolic origin is carried
// separately on the field by `fieldOf`); an unresolved reference keeps its
// verbatim `@NAME` text — the parse diagnostic, not a fabricated value, is the
// signal (ADR 022, decision 5).
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
    case 'SymbolValue':
      return value.resolved ?? `@${value.name}`;
    default:
      return undefined;
  }
}

// Bare-token values across ALL repeated sibling blocks of the given key (an
// additive ref-list; first-wins would drop later blocks — survey #19).
function refTokens(
  block: BlockNode,
  key: string,
  caseInsensitive = false,
): readonly string[] {
  const tokens: string[] = [];
  for (const list of blocksNamed(block, key, caseInsensitive)) {
    for (const child of list.children) {
      const token = tokenOf(child);
      if (token !== undefined) tokens.push(token);
    }
  }
  return tokens;
}

// The block's scalar leaves restricted to the modeled keys, in modeled order.
function scalarLeaves(
  block: BlockNode,
  keys: readonly string[],
): readonly EntityField[] {
  const byKey = new Map<string, EntityField>();
  for (const child of block.children) {
    if (child.kind !== 'Assignment' || child.value.kind === 'Block') continue;
    const field = fieldOf(child);
    if (field === undefined || byKey.has(field.key)) continue;
    byKey.set(field.key, field);
  }
  const fields: EntityField[] = [];
  for (const key of keys) {
    const field = byKey.get(key);
    if (field !== undefined) fields.push(field);
  }
  return fields;
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
    case 'SymbolValue':
      return node.resolved ?? `@${node.name}`;
    default:
      return undefined;
  }
}
