import { createTheme, ThemeProvider } from '@mui/material';
import { RichTreeView } from '@mui/x-tree-view/RichTreeView';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { FileTreeItem } from './file-tree-item.component';

const theme = createTheme();

const items = [
  { children: [{ id: 'dir/child', label: 'child' }], id: 'dir', label: 'dir' },
  { id: 'leaf', label: 'leaf' },
];

function iconContainerOf(label: string): Element {
  const content = screen
    .getByText(label)
    .closest('[class*="MuiTreeItem-content"]');
  const icon = content?.querySelector('[class*="MuiTreeItem-iconContainer"]');
  if (icon === null || icon === undefined) throw new Error('no icon container');
  return icon;
}

function renderTree(onSelect: () => void) {
  return render(
    <RichTreeView
      expansionTrigger="iconContainer"
      items={items}
      slots={{ item: FileTreeItem }}
      onSelectedItemsChange={onSelect}
    />,
    { wrapper },
  );
}

function treeItemOf(label: string): Element {
  const item = screen.getByText(label).closest('[role="treeitem"]');
  if (item === null) throw new Error('no treeitem');
  return item;
}

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('FileTreeItem', () => {
  it('expands on toggle click without selecting the item', () => {
    const onSelect = vi.fn();
    renderTree(onSelect);

    fireEvent.click(iconContainerOf('dir'));

    expect(screen.getByText('child')).toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('selects the directory when its label is clicked', () => {
    const onSelect = vi.fn();
    renderTree(onSelect);

    fireEvent.click(screen.getByText('dir'));

    expect(onSelect).toHaveBeenCalledWith(expect.anything(), 'dir');
  });

  it('selects a leaf item when its label is clicked', () => {
    const onSelect = vi.fn();
    renderTree(onSelect);

    fireEvent.click(screen.getByText('leaf'));

    expect(onSelect).toHaveBeenCalledWith(expect.anything(), 'leaf');
  });

  it('expands a collapsed directory when its label is double-clicked', () => {
    const onSelect = vi.fn();
    renderTree(onSelect);

    expect(treeItemOf('dir')).toHaveAttribute('aria-expanded', 'false');

    fireEvent.doubleClick(screen.getByText('dir'));

    expect(treeItemOf('dir')).toHaveAttribute('aria-expanded', 'true');
  });

  it('collapses an expanded directory when its label is double-clicked', () => {
    const onSelect = vi.fn();
    renderTree(onSelect);

    fireEvent.click(iconContainerOf('dir'));
    expect(treeItemOf('dir')).toHaveAttribute('aria-expanded', 'true');

    fireEvent.doubleClick(screen.getByText('dir'));

    expect(treeItemOf('dir')).toHaveAttribute('aria-expanded', 'false');
  });

  it('does not expand a leaf when its label is double-clicked', () => {
    const onSelect = vi.fn();
    renderTree(onSelect);

    fireEvent.doubleClick(screen.getByText('leaf'));

    expect(treeItemOf('leaf')).not.toHaveAttribute('aria-expanded');
  });
});
