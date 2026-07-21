import type { BlockChild } from './paradox-node.model';

// A substitution-constant DEFINITION (`@NAME = …`): an assignment whose key is a
// SymbolDefinition node. A definition is a declaration, never a field — NO scalar
// reader, fixed-allow-list or open-key-space, ever projects one into a field
// (ADR 022, decision 7). The guarantee is enforced by this node-kind check, not by
// symbol names happening not to collide with a modeled key (`@10 = 5` inside a
// numeric-keyed `position` block would otherwise leak in with no test to see it).
export function isSymbolDefinition(node: BlockChild): boolean {
  return node.kind === 'Assignment' && node.key.kind === 'SymbolDefinition';
}
