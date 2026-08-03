import type { TechnologyCategoryEntity } from '@contracts';
import type { AssignmentNode, BlockChild, Script } from '@paradox-parser';

// The declared category vocabulary lives directly under this block as a flat list
// of bare tokens — NOT under a nested `categories` sub-block (verified against
// BICE and vanilla HOI4, which both declare the tokens as immediate children of
// `technology_categories`; see the ZMT-35 PR body).
const TECHNOLOGY_CATEGORIES_BLOCK = 'technology_categories';

// Reads the declared technology-category vocabulary (ZMT-35): every bare token
// listed directly under `technology_categories`, one entity per token carrying
// only its id. The sibling `technology_folders` block in the same file is out of
// scope (Q61) and never read — this reader descends only `technology_categories`.
// Categories are bare value tokens, not `key = value` assignments, so an
// assignment or comment inside the block is skipped rather than misread as a
// category. Stage-2 index resolution dedups identical tokens across sources and
// attaches provenance; this extractor stays per-file and emits one entity per
// token occurrence.
export function extractTechnologyCategories(
  parsedTarget: Script,
): readonly TechnologyCategoryEntity[] {
  const entities: TechnologyCategoryEntity[] = [];
  for (const child of parsedTarget.children) {
    if (
      child.kind !== 'Assignment' ||
      keyName(child) !== TECHNOLOGY_CATEGORIES_BLOCK ||
      child.value.kind !== 'Block'
    ) {
      continue;
    }
    for (const token of child.value.children) {
      const id = tokenOf(token);
      if (id !== undefined) {
        entities.push({ id });
      }
    }
  }
  return entities;
}

function keyName(assignment: AssignmentNode): string {
  return assignment.key.kind === 'StringValue'
    ? assignment.key.value
    : assignment.key.name;
}

// A bare category token: an unquoted identifier (`artillery`) or a quoted string.
// Blocks, assignments, and comments carry no category and return undefined.
function tokenOf(node: BlockChild): string | undefined {
  switch (node.kind) {
    case 'Identifier':
      return node.name;
    case 'StringValue':
      return node.value;
    default:
      return undefined;
  }
}
