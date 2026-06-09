import { DESCRIPTOR_FILENAME, FILE_SUPPORT, FsNode } from '@contracts';
import { Box, CircularProgress, Typography } from '@mui/material';
import { RichTreeView } from '@mui/x-tree-view/RichTreeView';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useFileTree } from '../hooks';

export interface FileTreeSelection {
  readonly isModRoot: boolean;
  readonly path: null | string;
}

interface FileTreeProps {
  hideUnsupportedFiles: boolean;
  onSelect: (selection: FileTreeSelection) => void;
  root: null | string;
  selectedPath: null | string;
}

interface FsTreeItem {
  readonly children?: readonly FsTreeItem[];
  id: string;
  label: string;
  readonly node: FsNode | null;
}

export function FileTree({
  hideUnsupportedFiles,
  onSelect,
  root,
  selectedPath,
}: FileTreeProps) {
  const { t } = useTranslation(['feature.modContent']);
  const { childrenByPath, error, loadChildren, loadingRoot, rootChildren } =
    useFileTree({ hideUnsupportedFiles, root });
  const [userExpanded, setUserExpanded] = useState<readonly string[]>([]);
  const loadingLabel = t('feature.modContent:fileTree.loading');

  const expanded = useMemo<readonly string[]>(() => {
    if (root === null) return userExpanded;
    return userExpanded.includes(root) ? userExpanded : [root, ...userExpanded];
  }, [root, userExpanded]);

  const modRootPaths = useMemo<ReadonlySet<string>>(() => {
    const result = new Set<string>();
    if (
      root !== null &&
      rootChildren.some((n) => n.name === DESCRIPTOR_FILENAME)
    ) {
      result.add(root);
    }
    for (const [parentPath, children] of childrenByPath.entries()) {
      if (parentPath === root || parentPath === '') continue;
      if (children.some((n) => n.name === DESCRIPTOR_FILENAME)) {
        result.add(parentPath);
      }
    }
    return result;
  }, [root, rootChildren, childrenByPath]);

  const items = useMemo<readonly FsTreeItem[]>(() => {
    if (root === null) return [];
    const childItems = rootChildren.map((n) =>
      nodeToItem(n, childrenByPath, loadingLabel),
    );
    const syntheticRoot: FsTreeItem = {
      children: childItems.length > 0 ? childItems : undefined,
      id: root,
      label: basename(root),
      node: null,
    };
    return [syntheticRoot];
  }, [root, rootChildren, childrenByPath, loadingLabel]);

  const isItemDisabled = (item: FsTreeItem): boolean => {
    return item.node?.support === FILE_SUPPORT.unsupported;
  };

  const handleExpandedChange = (
    _event: null | React.SyntheticEvent,
    nextExpanded: readonly string[],
  ) => {
    const newlyExpanded = nextExpanded.filter((id) => !expanded.includes(id));
    newlyExpanded.forEach((path) => {
      if (path === root) return;
      loadChildren(path);
    });
    setUserExpanded(nextExpanded.filter((id) => id !== root));
  };

  const handleSelectedChange = (
    _event: null | React.SyntheticEvent,
    itemId: null | string,
  ) => {
    if (itemId === null) {
      onSelect({ isModRoot: false, path: null });
      return;
    }
    if (itemId.endsWith('::loading')) return;
    onSelect({ isModRoot: modRootPaths.has(itemId), path: itemId });
  };

  if (loadingRoot) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" sx={{ p: 2 }} variant="body2">
        {error.message}
      </Typography>
    );
  }

  if (items.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ p: 2 }} variant="body2">
        {t('feature.modContent:fileTree.empty')}
      </Typography>
    );
  }

  return (
    <RichTreeView<FsTreeItem>
      expandedItems={[...expanded]}
      isItemDisabled={isItemDisabled}
      items={[...items]}
      selectedItems={selectedPath}
      sx={{
        '& .Mui-disabled, & .Mui-disabled .MuiTreeItem-content': {
          cursor: 'default',
        },
      }}
      onExpandedItemsChange={handleExpandedChange}
      onSelectedItemsChange={handleSelectedChange}
    />
  );
}

function basename(path: string): string {
  const parts = path.split(/[/\\]/).filter((p) => p.length > 0);
  return parts[parts.length - 1] ?? path;
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
