import type { TechTreeNode, TechTreeNodeView } from '@zmt/renderer/tech-tree/util';

export interface NodeEmphasisContext {
  readonly names: Readonly<Record<string, string>>;
  readonly search: string;
  readonly selectedCategories: ReadonlySet<string>;
  readonly selectedId: null | string;
}

export function matchesTechnologySearch(
  query: string,
  token: string,
  name: null | string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === '') {
    return false;
  }
  return token.toLowerCase().includes(needle) || (name?.toLowerCase().includes(needle) ?? false);
}

export function toNodeView(node: TechTreeNode, context: NodeEmphasisContext): TechTreeNodeView {
  const name = context.names[node.token] ?? null;
  const highlighted = matchesTechnologySearch(context.search, node.token, name);
  const filtered =
    context.selectedCategories.size > 0 &&
    !node.categories.some((category) => context.selectedCategories.has(category));
  return {
    ...node,
    dimmed: !highlighted && filtered,
    highlighted,
    name,
    selected: node.id === context.selectedId,
  };
}
