import type {
  CharacterEntity,
  CharacterPortraitGroup,
  CharacterRole,
  CharacterRoleBag,
  CharacterRoleId,
  EntityBlockScopeSegment,
  EntityField,
  PortraitGroup,
} from '@contracts';
import type {
  AssignmentNode,
  BlockChild,
  BlockNode,
  ParadoxValue,
  Script,
} from '@paradox-parser';

const CHARACTERS_BLOCK = 'characters';
const INSTANCE_BLOCK = 'instance';
const KEY_NAME = 'name';
const PORTRAITS_BLOCK = 'portraits';
const TRAITS_BLOCK = 'traits';

const ROOT_SCOPE: readonly EntityBlockScopeSegment[] = [];

// Present-only projection: a group or role surfaces only when its block exists in
// the source; iteration follows file order so the form renders blocks as written.
const PORTRAIT_GROUPS: readonly PortraitGroup[] = ['army', 'civilian', 'navy'];
const ROLE_IDS: readonly CharacterRoleId[] = [
  'advisor',
  'corps_commander',
  'country_leader',
  'field_marshal',
  'navy_leader',
  'scientist',
];

// Open key→value sub-blocks projected as prop-bags per role (advisor `modifier` /
// `research_bonus`, scientist `skills`). A role not listed projects no bags; a
// listed sub-block surfaces only when present (present-only).
const ROLE_BAG_KEYS: Readonly<
  Partial<Record<CharacterRoleId, readonly string[]>>
> = {
  advisor: ['modifier', 'research_bonus'],
  scientist: ['skills'],
};

export function extractCharacters(
  parsedTarget: Script,
): readonly CharacterEntity[] {
  const entities: CharacterEntity[] = [];
  for (const child of parsedTarget.children) {
    if (
      child.kind !== 'Assignment' ||
      keyName(child) !== CHARACTERS_BLOCK ||
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
        name: scalarOf(block, KEY_NAME),
        portraits: portraitGroups(block),
        roles: roleBlocks(block),
        token: keyName(entry),
      });
    }
  }
  return entities;
}

// A `@NAME` reference lowers to its resolved literal while carrying its symbolic
// origin on the field (ADR 022); other values map to a plain field.
function fieldOf(key: string, value: ParadoxValue): EntityField | undefined {
  const raw = rawValueOf(value);
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

function isPortraitGroup(name: string): name is PortraitGroup {
  return (PORTRAIT_GROUPS as readonly string[]).includes(name);
}

function isRoleId(name: string): name is CharacterRoleId {
  return (ROLE_IDS as readonly string[]).includes(name);
}

function keyName(assignment: AssignmentNode): string {
  return assignment.key.kind === 'StringValue'
    ? assignment.key.value
    : assignment.key.name;
}

function portraitGroups(block: BlockNode): readonly CharacterPortraitGroup[] {
  const portraits = findBlock(block, PORTRAITS_BLOCK);
  if (portraits === undefined) return [];
  const groups: CharacterPortraitGroup[] = [];
  for (const child of portraits.children) {
    if (child.kind !== 'Assignment' || child.value.kind !== 'Block') continue;
    const name = keyName(child);
    if (!isPortraitGroup(name)) continue;
    groups.push({ group: name, rows: scalarLeaves(child.value) });
  }
  return groups;
}

// Scalar values keep their raw source token (quotes included) so a save writes
// them back byte-identically through the verbatim `key = value` path; trait
// tokens (see traitTokens) are unquoted because they are bare value-list items.
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

// The role's projected open prop-bag sub-blocks (advisor `modifier` /
// `research_bonus`, scientist `skills`). Each surfaces only when present; its
// scalar leaves keep their raw value tokens so an untouched bag round-trips.
function roleBags(
  roleBlock: BlockNode,
  id: CharacterRoleId,
): readonly CharacterRoleBag[] {
  const names = ROLE_BAG_KEYS[id];
  if (names === undefined) return [];
  const bags: CharacterRoleBag[] = [];
  for (const name of names) {
    const sub = findBlock(roleBlock, name);
    if (sub === undefined) continue;
    bags.push({ name, rows: scalarLeaves(sub) });
  }
  return bags;
}

// Surfaces a character's role blocks, walking children in file order. A role-id
// block at the character root surfaces at root scope; an `instance = { … }` DLC
// wrapper is unwrapped and the role blocks it nests surface with an indexed
// `instance` scope segment, so a save writes each back inside that same wrapper
// (ADR 019 indexed segment). The wrapper and its DLC condition are not modeled —
// only the nested roles surface; the rest of the `instance` stays verbatim. Every
// `instance` sibling advances the index, matching how the write path counts
// same-name siblings, so non-role instances still address the right wrapper.
function roleBlocks(block: BlockNode): readonly CharacterRole[] {
  const roles: CharacterRole[] = [];
  let instanceIndex = 0;
  for (const child of block.children) {
    if (child.kind !== 'Assignment' || child.value.kind !== 'Block') continue;
    const name = keyName(child);
    if (name === INSTANCE_BLOCK) {
      const scope: readonly EntityBlockScopeSegment[] = [
        { index: instanceIndex, name: INSTANCE_BLOCK },
      ];
      instanceIndex += 1;
      for (const nested of child.value.children) {
        if (nested.kind !== 'Assignment' || nested.value.kind !== 'Block') {
          continue;
        }
        const nestedName = keyName(nested);
        if (!isRoleId(nestedName)) continue;
        roles.push(roleFrom(nested.value, nestedName, scope));
      }
      continue;
    }
    if (!isRoleId(name)) continue;
    roles.push(roleFrom(child.value, name, ROOT_SCOPE));
  }
  return roles;
}

function roleFrom(
  roleBlock: BlockNode,
  id: CharacterRoleId,
  scope: readonly EntityBlockScopeSegment[],
): CharacterRole {
  return {
    bags: roleBags(roleBlock, id),
    id,
    scalars: scalarLeaves(roleBlock),
    scope,
    traits: traitTokens(roleBlock),
  };
}

// The role's own scalar leaf fields. Nested sub-blocks (the `traits` list and
// ecosystem blocks like advisor `on_add`) are skipped here — they stay verbatim
// in the source and are not part of the projected scalar surface (R-CODE-5).
function scalarLeaves(block: BlockNode): readonly EntityField[] {
  const fields: EntityField[] = [];
  for (const child of block.children) {
    if (child.kind !== 'Assignment' || child.value.kind === 'Block') continue;
    const field = fieldOf(keyName(child), child.value);
    if (field !== undefined) fields.push(field);
  }
  return fields;
}

function scalarOf(block: BlockNode, key: string): string {
  const assignment = findAssignment(block, key);
  if (assignment === undefined) return '';
  return rawValueOf(assignment.value) ?? '';
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

function traitTokens(roleBlock: BlockNode): readonly string[] {
  const traits = findBlock(roleBlock, TRAITS_BLOCK);
  if (traits === undefined) return [];
  const tokens: string[] = [];
  for (const child of traits.children) {
    const token = tokenOf(child);
    if (token !== undefined) tokens.push(token);
  }
  return tokens;
}
