import {
  TreeItemContent,
  TreeItemGroupTransition,
  TreeItemIconContainer,
  TreeItemLabel,
  TreeItemProps,
  TreeItemRoot,
} from '@mui/x-tree-view/TreeItem';
import { TreeItemIcon } from '@mui/x-tree-view/TreeItemIcon';
import { TreeItemProvider } from '@mui/x-tree-view/TreeItemProvider';
import { useTreeItem } from '@mui/x-tree-view/useTreeItem';
import { forwardRef, Ref } from 'react';

export const FileTreeItem = forwardRef(function FileTreeItem(
  props: TreeItemProps,
  ref: Ref<HTMLLIElement>,
) {
  const { children, disabled, id, itemId, label } = props;
  const {
    getContentProps,
    getContextProviderProps,
    getGroupTransitionProps,
    getIconContainerProps,
    getLabelProps,
    getRootProps,
    status,
  } = useTreeItem({ children, disabled, id, itemId, label, rootRef: ref });

  return (
    <TreeItemProvider {...getContextProviderProps()}>
      <TreeItemRoot {...getRootProps()}>
        <TreeItemContent {...getContentProps()}>
          <TreeItemIconContainer
            {...getIconContainerProps({
              // Icon container is nested inside content; stop the click so it
              // cannot bubble to content's selection handler. Expansion still
              // fires because the tree sets expansionTrigger="iconContainer".
              onClick: (event) => event.stopPropagation(),
            })}
          >
            <TreeItemIcon status={status} />
          </TreeItemIconContainer>
          <TreeItemLabel {...getLabelProps()} />
        </TreeItemContent>
        {children && <TreeItemGroupTransition {...getGroupTransitionProps()} />}
      </TreeItemRoot>
    </TreeItemProvider>
  );
});
