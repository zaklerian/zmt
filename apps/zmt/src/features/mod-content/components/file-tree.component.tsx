import { FILE_SUPPORT, FileSupport, ProjectedSource } from '@contracts';
import { Typography } from '@mui/material';
import { RichTreeView } from '@mui/x-tree-view/RichTreeView';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FsTreeItem } from './file-tree-item.model';
import { basename } from './file-tree-item.util';
import {
  FileTreeRoot,
  FileTreeRootContribution,
} from './file-tree-root.component';

export interface FileTreeSelection {
  readonly isModRoot: boolean;
  readonly path: null | string;
  support: FileSupport | null;
}

interface FileTreeProps {
  hideUnsupportedFiles: boolean;
  onSelect: (selection: FileTreeSelection) => void;
  selectedPath: null | string;
  sources: readonly ProjectedSource[];
}

export function FileTree({
  hideUnsupportedFiles,
  onSelect,
  selectedPath,
  sources,
}: FileTreeProps) {
  const { t } = useTranslation(['feature.modContent']);
  const [contributions, setContributions] = useState<
    ReadonlyMap<string, FileTreeRootContribution>
  >(new Map());
  const [userExpanded, setUserExpanded] = useState<readonly string[]>([]);
  const loadingLabel = t('feature.modContent:fileTree.loading');

  const handleContribution = useCallback(
    (root: string, contribution: FileTreeRootContribution) => {
      setContributions((prev) => {
        const next = new Map(prev);
        next.set(root, contribution);
        return next;
      });
    },
    [],
  );

  const rootPaths = useMemo<readonly string[]>(
    () => sources.map((s) => s.path),
    [sources],
  );

  const expanded = useMemo<readonly string[]>(() => {
    const set = new Set<string>(rootPaths);
    for (const id of userExpanded) set.add(id);
    return [...set];
  }, [rootPaths, userExpanded]);

  const items = useMemo<readonly FsTreeItem[]>(
    () =>
      sources.map(
        (s) =>
          contributions.get(s.path)?.item ?? {
            children: [
              { id: `${s.path}::loading`, label: loadingLabel, node: null },
            ],
            id: s.path,
            label: basename(s.path),
            node: null,
          },
      ),
    [contributions, loadingLabel, sources],
  );

  const supportByPath = useMemo<ReadonlyMap<string, FileSupport>>(() => {
    const map = new Map<string, FileSupport>();
    const walk = (nodes: readonly FsTreeItem[]): void => {
      for (const item of nodes) {
        if (item.node !== null) map.set(item.id, item.node.support);
        if (item.children !== undefined) walk(item.children);
      }
    };
    walk(items);
    return map;
  }, [items]);

  const isModRoot = useCallback(
    (path: string): boolean => {
      if (sources.some((s) => s.path === path && s.permission === 'editable')) {
        return true;
      }
      for (const s of sources) {
        if (contributions.get(s.path)?.modRootPaths.has(path)) return true;
      }
      return false;
    },
    [contributions, sources],
  );

  const loadOwnedChildren = (path: string): void => {
    let owner: null | string = null;
    for (const root of rootPaths) {
      if (
        isUnder(root, path) &&
        (owner === null || root.length > owner.length)
      ) {
        owner = root;
      }
    }
    if (owner !== null) contributions.get(owner)?.loadChildren(path);
  };

  const isItemDisabled = (item: FsTreeItem): boolean =>
    item.node?.support === FILE_SUPPORT.unsupported;

  const handleExpandedChange = (
    _event: null | React.SyntheticEvent,
    nextExpanded: readonly string[],
  ) => {
    const newlyExpanded = nextExpanded.filter((id) => !expanded.includes(id));
    newlyExpanded.forEach((path) => {
      if (rootPaths.includes(path)) return;
      loadOwnedChildren(path);
    });
    setUserExpanded(nextExpanded.filter((id) => !rootPaths.includes(id)));
  };

  const handleSelectedChange = (
    _event: null | React.SyntheticEvent,
    itemId: null | string,
  ) => {
    if (itemId === null) {
      onSelect({ isModRoot: false, path: null, support: null });
      return;
    }
    if (itemId.endsWith('::loading') || itemId.endsWith('::error')) return;
    onSelect({
      isModRoot: isModRoot(itemId),
      path: itemId,
      support: supportByPath.get(itemId) ?? null,
    });
  };

  return (
    <>
      {sources.map((s) => (
        <FileTreeRoot
          key={s.path}
          hideUnsupportedFiles={hideUnsupportedFiles}
          root={s.path}
          onContribution={handleContribution}
        />
      ))}
      {items.length === 0 ? (
        <Typography color="text.secondary" sx={{ p: 2 }} variant="body2">
          {t('feature.modContent:fileTree.empty')}
        </Typography>
      ) : (
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
      )}
    </>
  );
}

function isUnder(parent: string, child: string): boolean {
  if (!child.startsWith(parent)) return false;
  const rest = child.slice(parent.length);
  return rest.startsWith('/') || rest.startsWith('\\');
}
