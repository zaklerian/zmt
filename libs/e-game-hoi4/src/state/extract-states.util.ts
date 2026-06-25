import type {
  EntityField,
  StateEntity,
  StateProvinceBuildings,
} from '@contracts';
import type {
  AssignmentNode,
  BlockChild,
  BlockNode,
  ParadoxValue,
  Script,
} from '@paradox-parser';

const STATE_BLOCK = 'state';
const BUILDINGS_BLOCK = 'buildings';
const HISTORY_BLOCK = 'history';
const PROVINCES_BLOCK = 'provinces';
const RESOURCES_BLOCK = 'resources';

const KEY_ID = 'id';
const KEY_NAME = 'name';

// Modeled root scalar surfaces, in render order (semantic, not alphabetical —
// R-CODE-9 carve-out). Keys outside this set stay verbatim in the lossless node
// and are never projected (R-CODE-5).
const ROOT_KEYS: readonly string[] = [
  'id',
  'name',
  'manpower',
  'state_category',
  'local_supplies',
  'impassable',
];

// `history` is modeled THIN: only owner / controller are projected. The dated
// `<date> { … }` event blocks, the history building overrides, and victory_points
// stay verbatim (R-CODE-5).
const HISTORY_KEYS: readonly string[] = ['owner', 'controller'];

export function extractStates(parsedTarget: Script): readonly StateEntity[] {
  const entities: StateEntity[] = [];
  for (const child of parsedTarget.children) {
    if (
      child.kind !== 'Assignment' ||
      keyName(child) !== STATE_BLOCK ||
      child.value.kind !== 'Block'
    ) {
      continue;
    }
    const block = child.value;
    const buildings = findBlock(block, BUILDINGS_BLOCK);
    const history = findBlock(block, HISTORY_BLOCK);
    const resources = findBlock(block, RESOURCES_BLOCK);
    entities.push({
      // `buildings` rows are the state-wide building scalars; the per-province
      // `<id> = { building = level … }` object children are Block-valued and are
      // skipped by scalarLeaves (they surface as provinceBuildings).
      buildings: buildings === undefined ? [] : scalarLeaves(buildings),
      history:
        history === undefined ? [] : modeledScalars(history, HISTORY_KEYS),
      id: scalarOf(block, KEY_ID),
      name: scalarOf(block, KEY_NAME),
      provinceBuildings:
        buildings === undefined ? [] : provinceBuildings(buildings),
      provinces: tokenList(block, PROVINCES_BLOCK),
      resources: resources === undefined ? [] : scalarLeaves(resources),
      rootScalars: modeledScalars(block, ROOT_KEYS),
    });
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

function keyName(assignment: AssignmentNode): string {
  return assignment.key.kind === 'Identifier'
    ? assignment.key.name
    : assignment.key.value;
}

// The block's scalar leaves restricted to the modeled keys, in modeled order —
// used for the fixed root fields and the thin history projection.
function modeledScalars(
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

// The per-province building objects of the `buildings` block: each Block-valued
// `<province-id> = { building = level … }` child, keyed by its province id and
// projected as the flat scalar leaves of its sub-block (ZMT-E16). Non-Block children
// (the state-wide building scalars) are skipped — they surface as buildings rows.
function provinceBuildings(
  block: BlockNode,
): readonly StateProvinceBuildings[] {
  const entries: StateProvinceBuildings[] = [];
  for (const child of block.children) {
    if (child.kind === 'Assignment' && child.value.kind === 'Block') {
      entries.push({ id: keyName(child), rows: scalarLeaves(child.value) });
    }
  }
  return entries;
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

// Every scalar leaf of the block, in file order — the variable-key map projection
// (resources, the state-wide buildings rows, a province building object's rows).
// Block-valued children (e.g. buildings' per-province `<id> = { … }` objects,
// history overrides) are skipped and stay verbatim (R-CODE-5).
function scalarLeaves(block: BlockNode): readonly EntityField[] {
  const fields: EntityField[] = [];
  for (const child of block.children) {
    if (child.kind !== 'Assignment' || child.value.kind === 'Block') continue;
    const value = rawValueOf(child.value);
    if (value !== undefined) fields.push({ key: keyName(child), value });
  }
  return fields;
}

function scalarOf(block: BlockNode, key: string): string {
  for (const child of block.children) {
    if (child.kind !== 'Assignment' || child.value.kind === 'Block') continue;
    if (keyName(child) === key) return rawValueOf(child.value) ?? '';
  }
  return '';
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
