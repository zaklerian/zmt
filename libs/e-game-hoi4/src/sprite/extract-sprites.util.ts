import type { SpriteEntity } from '@contracts';
import type {
  AssignmentNode,
  BlockChild,
  ParadoxValue,
  Script,
} from '@paradox-parser';

// A `.gfx` sprite is any `*SpriteType` block carrying a `name`: bare `SpriteType`
// plus BICE's `frameAnimatedSpriteType`, `corneredTileSpriteType`, and
// `textSpriteType` (verified against BICE — read which variants exist, not the
// prompt's examples). All four register in the engine's `spriteTypes` collection
// by their inner `name`, so all four are resolvable sprites. The suffix is matched
// case-insensitively; the plural `spriteTypes` wrapper ends in `spritetypes`, so
// it is never mistaken for a sprite block.
const SPRITE_TYPE_SUFFIX = 'spritetype';

// Sprite inner keys, matched case-insensitively: BICE writes both `texturefile`
// and `textureFile`, and Paradox keys are case-insensitive, so the lookup lowers
// the key rather than pinning one spelling.
const KEY_NAME = 'name';
const KEY_NO_OF_FRAMES = 'noofframes';
const KEY_TEXTURE_FILE = 'texturefile';

// Reads EVERY sprite declaration in a `.gfx` file, keyed by its inner `name`, and
// emits one entity per block (ZMT-39). This is the repeated-block read the
// ZMT-E27 class demands: a `.gfx` declares dozens of blocks all literally named
// `SpriteType`, so a first-match reader would drop all but one — this reader walks
// the whole tree and emits a sprite for every `*SpriteType` block that has a
// `name`. Same-name duplicates across the file are all emitted; the source-scoped
// index does the last-wins name resolution across files (stage 2), exactly as it
// does for every other entity type. The walk is recursive so it finds sprites
// whether wrapped in `spriteTypes = { … }` or declared at the file's top level
// (BICE carries both), and ignores `bitmapfonts` / `objectTypes` blocks, which
// declare no `*SpriteType`. `texturefile` is emitted RAW — no normalization, no
// resolution — for the standalone asset resolver (resolution B) to resolve.
export function extractSprites(parsedTarget: Script): readonly SpriteEntity[] {
  const entities: SpriteEntity[] = [];
  collectSprites(parsedTarget.children, entities);
  return entities;
}

function assignmentBlock(node: BlockChild): AssignmentNode | undefined {
  return node.kind === 'Assignment' && node.value.kind === 'Block'
    ? node
    : undefined;
}

function collectSprites(
  children: readonly BlockChild[],
  entities: SpriteEntity[],
): void {
  for (const child of children) {
    const assignment = assignmentBlock(child);
    if (assignment === undefined || assignment.value.kind !== 'Block') {
      continue;
    }
    const sprite = isSpriteType(assignment)
      ? spriteOf(assignment.value.children)
      : undefined;
    if (sprite !== undefined) {
      entities.push(sprite);
    }
    // Descend regardless: sprites live under the `spriteTypes` wrapper, and a
    // sprite block carries no nested `*SpriteType`, so recursing into an emitted
    // sprite is a cheap no-op that keeps the walk uniform.
    collectSprites(assignment.value.children, entities);
  }
}

function findScalar(
  children: readonly BlockChild[],
  lowerKey: string,
): ParadoxValue | undefined {
  for (const child of children) {
    if (
      child.kind === 'Assignment' &&
      keyName(child).toLowerCase() === lowerKey
    ) {
      return child.value;
    }
  }
  return undefined;
}

function isSpriteType(assignment: AssignmentNode): boolean {
  return keyName(assignment).toLowerCase().endsWith(SPRITE_TYPE_SUFFIX);
}

function keyName(assignment: AssignmentNode): string {
  return assignment.key.kind === 'StringValue'
    ? assignment.key.value
    : assignment.key.name;
}

function numberOf(value: ParadoxValue | undefined): null | number {
  return value?.kind === 'NumberValue' ? value.value : null;
}

function spriteOf(children: readonly BlockChild[]): SpriteEntity | undefined {
  const id = stringOf(findScalar(children, KEY_NAME));
  if (id === undefined) {
    return undefined;
  }
  return {
    frames: numberOf(findScalar(children, KEY_NO_OF_FRAMES)),
    id,
    texturefile: stringOf(findScalar(children, KEY_TEXTURE_FILE)) ?? '',
  };
}

function stringOf(value: ParadoxValue | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value.kind === 'StringValue') {
    return value.value;
  }
  if (value.kind === 'Identifier') {
    return value.name;
  }
  return undefined;
}
