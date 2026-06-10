import { DESCRIPTOR_FILENAME, FsNode, IpcError } from '@contracts';

import { FsTreeItem } from './file-tree-item.model';

interface BuildRootItemOptions {
  readonly childrenByPath: ReadonlyMap<string, readonly FsNode[]>;
  readonly error: IpcError | null;
  readonly loadingLabel: string;
  readonly loadingRoot: boolean;
  readonly root: string;
  readonly rootChildren: readonly FsNode[];
}

export function basename(path: string): string {
  const parts = path.split(/[/\\]/).filter((p) => p.length > 0);
  return parts[parts.length - 1] ?? path;
}

export function buildRootItem({
  childrenByPath,
  error,
  loadingLabel,
  loadingRoot,
  root,
  rootChildren,
}: BuildRootItemOptions): FsTreeItem {
  let children: readonly FsTreeItem[] | undefined;
  if (loadingRoot) {
    children = [{ id: `${root}::loading`, label: loadingLabel, node: null }];
  } else if (error) {
    children = [{ id: `${root}::error`, label: error.message, node: null }];
  } else {
    const childItems = rootChildren.map((n) =>
      nodeToItem(n, childrenByPath, loadingLabel),
    );
    children = childItems.length > 0 ? childItems : undefined;
  }

  return { children, id: root, label: basename(root), node: null };
}

export function descriptorScanModRoots(
  root: string,
  childrenByPath: ReadonlyMap<string, readonly FsNode[]>,
): ReadonlySet<string> {
  const result = new Set<string>();
  for (const [parentPath, children] of childrenByPath.entries()) {
    if (parentPath === root || parentPath === '') continue;
    if (children.some((n) => n.name === DESCRIPTOR_FILENAME)) {
      result.add(parentPath);
    }
  }
  return result;
}

export function mergeNewRoots(
  prior: readonly string[],
  newRoots: readonly string[],
): readonly string[] {
  const merged = new Set(prior);
  for (const root of newRoots) merged.add(root);
  return [...merged];
}

function nodeToItem(
  node: FsNode,
  childrenByPath: ReadonlyMap<string, readonly FsNode[]>,
  loadingLabel: string,
): FsTreeItem {
  const children = childrenByPath.get(node.path);
  const childItems = children?.map((c) =>
    nodeToItem(c, childrenByPath, loadingLabel),
  );

  return {
    children:
      node.type === 'directory' && node.hasChildren
        ? (childItems ?? [
            { id: `${node.path}::loading`, label: loadingLabel, node: null },
          ])
        : undefined,
    id: node.path,
    label: node.name,
    node,
  };
}
