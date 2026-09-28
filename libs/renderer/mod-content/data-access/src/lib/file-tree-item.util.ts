import type { FsNode } from '@zmt/contracts';
import type { FileTreeItem } from '@zmt/renderer/mod-content/util';

export type ChildrenByPath = Readonly<Record<string, readonly FsNode[]>>;

export function basename(path: string): string {
  const parts = path.split(/[/\\]/u).filter((part) => part.length > 0);
  return parts.at(-1) ?? path;
}

function toItem(node: FsNode, childrenByPath: ChildrenByPath): FileTreeItem {
  const expandable = node.type === 'directory' && node.hasChildren;
  const loaded = childrenByPath[node.path];
  return {
    children: expandable && loaded ? loaded.map((child) => toItem(child, childrenByPath)) : null,
    expandable,
    id: node.path,
    label: node.name,
    node,
  };
}

export function toFileTreeItems(
  root: null | string,
  childrenByPath: ChildrenByPath,
): readonly FileTreeItem[] {
  if (root === null) {
    return [];
  }
  const rootChildren = childrenByPath[root];
  return [
    {
      children: rootChildren ? rootChildren.map((child) => toItem(child, childrenByPath)) : null,
      expandable: true,
      id: root,
      label: basename(root),
      node: null,
    },
  ];
}
