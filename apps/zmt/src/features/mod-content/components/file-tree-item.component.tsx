import { useTreeItemUtils } from '@mui/x-tree-view/hooks';
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
import { forwardRef, MouseEvent, Ref } from 'react';

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
  const { interactions } = useTreeItemUtils({ children, itemId });

  // Double-click toggles a directory's expansion. expansionTrigger is the icon
  // container, so the two single-clicks preceding this event only select
  // (idempotent) rather than toggling — this lands exactly one clean toggle.
  const handleDoubleClick = (event: MouseEvent) => {
    if (status.expandable) interactions.handleExpansion(event);
  };

  return (
    <TreeItemProvider {...getContextProviderProps()}>
      <TreeItemRoot {...getRootProps()}>
        <TreeItemContent
          {...getContentProps({ onDoubleClick: handleDoubleClick })}
        >
          <TreeItemIconContainer
            {...getIconContainerProps({
              // Icon container is nested inside content; stop click and
              // double-click so neither bubbles to content's selection or
              // double-click-expansion handler. Single-click expansion still
              // fires because the tree sets expansionTrigger="iconContainer".
              onClick: (event) => event.stopPropagation(),
              onDoubleClick: (event) => event.stopPropagation(),
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
