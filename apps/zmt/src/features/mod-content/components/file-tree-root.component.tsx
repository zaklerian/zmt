import { IpcError } from '@contracts';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useFileTree } from '../hooks';
import { FsTreeItem } from './file-tree-item.model';
import { buildRootItem, descriptorScanModRoots } from './file-tree-item.util';

export interface FileTreeRootContribution {
  readonly error: IpcError | null;
  readonly item: FsTreeItem;
  readonly loadChildren: (path: string) => void;
  readonly loadingRoot: boolean;
  readonly modRootPaths: ReadonlySet<string>;
}

interface FileTreeRootProps {
  hideUnsupportedFiles: boolean;
  onContribution: (
    root: string,
    contribution: FileTreeRootContribution,
  ) => void;
  root: string;
}

export function FileTreeRoot({
  hideUnsupportedFiles,
  onContribution,
  root,
}: FileTreeRootProps) {
  const { t } = useTranslation(['feature.modContent']);
  const { childrenByPath, error, loadChildren, loadingRoot, rootChildren } =
    useFileTree({ hideUnsupportedFiles, root });
  const loadingLabel = t('feature.modContent:fileTree.loading');

  const item = useMemo<FsTreeItem>(
    () =>
      buildRootItem({
        childrenByPath,
        error,
        loadingLabel,
        loadingRoot,
        root,
        rootChildren,
      }),
    [childrenByPath, error, loadingLabel, loadingRoot, root, rootChildren],
  );

  const modRootPaths = useMemo<ReadonlySet<string>>(
    () => descriptorScanModRoots(root, childrenByPath),
    [root, childrenByPath],
  );

  useEffect(() => {
    onContribution(root, {
      error,
      item,
      loadChildren,
      loadingRoot,
      modRootPaths,
    });
  }, [
    error,
    item,
    loadChildren,
    loadingRoot,
    modRootPaths,
    onContribution,
    root,
  ]);

  return null;
}
