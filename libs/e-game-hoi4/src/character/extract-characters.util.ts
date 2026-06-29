import type {
  CharacterEntity,
  CharacterPortraitGroup,
  CharacterRole,
  CharacterRoleBag,
  CharacterRoleId,
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
const KEY_NAME = 'name';
const PORTRAITS_BLOCK = 'portraits';
const TRAITS_BLOCK = 'traits';

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
  return assignment.key.kind === 'Identifier'
    ? assignment.key.name
    : assignment.key.value;
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

function roleBlocks(block: BlockNode): readonly CharacterRole[] {
  const roles: CharacterRole[] = [];
  for (const child of block.children) {
    if (child.kind !== 'Assignment' || child.value.kind !== 'Block') continue;
    const name = keyName(child);
    if (!isRoleId(name)) continue;
    roles.push({
      bags: roleBags(child.value, name),
      id: name,
      scalars: scalarLeaves(child.value),
      traits: traitTokens(child.value),
    });
  }
  return roles;
}

// The role's own scalar leaf fields. Nested sub-blocks (the `traits` list and
// ecosystem blocks like advisor `on_add`) are skipped here — they stay verbatim
// in the source and are not part of the projected scalar surface (R-CODE-5).
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
