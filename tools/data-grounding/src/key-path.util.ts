import type { AssignmentNode, BlockNode } from '@paradox-parser';

import { isSymbolDefinition } from '@paradox-parser';

export interface UnmodeledKey {
  readonly keyPath: string;
  readonly line: number;
}

// Walks an entity block against the set of key paths the model projects, and
// returns the *frontier* of unmodeled keys: a source key path is reported when it
// is not in the modeled set, and its subtree is NOT descended (everything under an
// unmodeled block is unmodeled by construction — reporting the block once, not its
// whole tree, is what keeps the baseline reviewable). A modeled block IS descended,
// so a dropped leaf inside it (e.g. `dependencies.tech` when only bare
// `dependencies` tokens are read) still surfaces. This is the set difference ADR
// 023 decision 2 names, taken at the boundary where the model stops learning.
//
// Symbol DEFINITIONS (`@NAME = …`) are skipped: a definition is a declaration, not
// a field (ADR 022 decision 7), so it is never an unmodeled key. Bare value-list
// tokens carry no key and never appear here.
export function collectUnmodeledKeys(
  block: BlockNode,
  modeled: ReadonlySet<string>,
  source: string,
): readonly UnmodeledKey[] {
  const found: UnmodeledKey[] = [];
  walk(block, null, modeled, source, found);
  return found;
}

// Nested path notation: `folder.position.x` is distinguishable from a root-level
// `x` (ADR 023 design note). Repeated same-named blocks (several `folder`s, an
// object-list) collapse to one path, aggregated by occurrence count downstream.
export function keyNameOf(assignment: AssignmentNode): string {
  return assignment.key.kind === 'StringValue'
    ? assignment.key.value
    : assignment.key.name;
}

export function lineOf(source: string, offset: number): number {
  let line = 1;
  const end = Math.min(offset, source.length);
  for (let i = 0; i < end; i += 1) {
    if (source[i] === '\n') line += 1;
  }
  return line;
}

function walk(
  block: BlockNode,
  parentPath: null | string,
  modeled: ReadonlySet<string>,
  source: string,
  found: UnmodeledKey[],
): void {
  for (const child of block.children) {
    if (child.kind !== 'Assignment' || isSymbolDefinition(child)) continue;
    const key = keyNameOf(child);
    const keyPath = parentPath === null ? key : `${parentPath}.${key}`;
    if (modeled.has(keyPath)) {
      if (child.value.kind === 'Block') {
        walk(child.value, keyPath, modeled, source, found);
      }
      continue;
    }
    found.push({ keyPath, line: lineOf(source, child.key.from) });
  }
}
