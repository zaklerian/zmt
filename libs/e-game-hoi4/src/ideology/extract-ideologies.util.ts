import type { EntityField, IdeologyEntity, IdeologyType } from '@contracts';
import type {
  AssignmentNode,
  BlockChild,
  BlockNode,
  ParadoxValue,
  Script,
} from '@paradox-parser';

const IDEOLOGIES_BLOCK = 'ideologies';
const TYPES_BLOCK = 'types';
const DYNAMIC_FACTION_NAMES_BLOCK = 'dynamic_faction_names';

// Modeled root scalar surfaces, in render order (semantic, not alphabetical —
// R-CODE-9 carve-out). Keys outside this set — and every block (`color`, `rules`,
// `modifiers`, `faction_modifiers`, `ai_*`) — stay verbatim in the lossless node
// and are never projected (R-CODE-5).
const ROOT_KEYS: readonly string[] = [
  'war_impact_on_world_tension',
  'faction_impact_on_world_tension',
];

// The one modeled scalar of a subideology entry. The subideology's own unmodeled
// scalars and blocks (e.g. a `color` triple, a third nesting level) are carried
// lossless — the two-level cap leaves them in the node (R-CODE-5).
const TYPE_KEYS: readonly string[] = ['can_be_randomly_selected'];

// Wrapper-aware extraction: ideologies are entries under the top-level
// `ideologies = { … }` wrapper; the extractor descends it and yields each
// `<ideology> = { … }` block as an entity (ADR 018, ZMT-18).
export function extractIdeologies(
  parsedTarget: Script,
): readonly IdeologyEntity[] {
  const entities: IdeologyEntity[] = [];
  for (const child of parsedTarget.children) {
    if (
      child.kind !== 'Assignment' ||
      keyName(child) !== IDEOLOGIES_BLOCK ||
      child.value.kind !== 'Block'
    ) {
      continue;
    }
    for (const entry of child.value.children) {
      if (entry.kind !== 'Assignment' || entry.value.kind !== 'Block') continue;
      const block = entry.value;
      entities.push({
        dynamicFactionNames: tokenList(block, DYNAMIC_FACTION_NAMES_BLOCK),
        rootScalars: modeledScalars(block, ROOT_KEYS),
        token: keyName(entry),
        types: subideologies(block),
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

function keyName(assignment: AssignmentNode): string {
  return assignment.key.kind === 'Identifier'
    ? assignment.key.name
    : assignment.key.value;
}

// The block's scalar leaves restricted to the modeled keys, in modeled order —
// used for the fixed root fields and the thin subideology projection.
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

// The `types` keyed-object map: each `<subideology> = { … }` child in file order,
// projecting only the modeled scalar template. An empty-bodied entry yields an
// entry with no rows (it still surfaces as a removable/renamable key).
function subideologies(block: BlockNode): readonly IdeologyType[] {
  const types = findBlock(block, TYPES_BLOCK);
  if (types === undefined) return [];
  const entries: IdeologyType[] = [];
  for (const child of types.children) {
    if (child.kind !== 'Assignment' || child.value.kind !== 'Block') continue;
    entries.push({
      key: keyName(child),
      scalars: modeledScalars(child.value, TYPE_KEYS),
    });
  }
  return entries;
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
