import type { Action } from '@r-core';

import { createTheme, ThemeProvider } from '@mui/material';
import { render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { CanvasActionContext } from '../canvas-actions';

import { initI18n } from '../../../i18n';
import { canvasActions } from '../canvas-actions';
import { CanvasContextMenu } from './canvas-context-menu.component';

const ANCHOR = { x: 100, y: 120 };
const theme = createTheme();

function contextFor(technologyId: null | string): CanvasActionContext {
  return {
    openAddChild: vi.fn(),
    openAddFree: vi.fn(),
    openDelete: vi.fn(),
    openEdit: vi.fn(),
    position: { x: 0, y: 0 },
    technologyId,
  };
}

function itemLabels(): readonly string[] {
  return screen
    .queryAllByRole('menuitem')
    .map((item) => item.textContent ?? '');
}

function renderMenu(
  actions: readonly Action<CanvasActionContext>[],
  context: CanvasActionContext,
) {
  return render(
    <CanvasContextMenu
      actions={actions}
      anchor={ANCHOR}
      context={context}
      onClose={vi.fn()}
    />,
    { wrapper },
  );
}

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

beforeAll(async () => {
  await initI18n('en');
});

describe('CanvasContextMenu', () => {
  it('renders the verbs available for a node context', () => {
    renderMenu(canvasActions, contextFor('fighter1'));

    expect(itemLabels()).toEqual(['Edit', 'Add prerequisite', 'Delete']);
  });

  it('renders only the zone-context verbs for the empty zone', () => {
    renderMenu(canvasActions, contextFor(null));

    expect(itemLabels()).toEqual(['Add technology here']);
  });

  // Req 4 / gate 3: nothing available means no menu at all, not an empty one.
  it('renders no menu when no action is available', () => {
    renderMenu(
      canvasActions.map((action) => ({ ...action, isAvailable: () => false })),
      contextFor('fighter1'),
    );

    expect(screen.queryByRole('menu')).toBeNull();
    expect(itemLabels()).toEqual([]);
  });

  // Gate 4: the surface has no node-vs-zone branch — content follows
  // `isAvailable` even when availability is the INVERSE of what a kind-switch
  // would produce. An action that only applies to the zone renders for a node
  // context, and a node-only action renders for the zone context, purely because
  // each says so.
  it('derives contents from isAvailable, not from the target kind', () => {
    const zoneOnlyOnANode: Action<CanvasActionContext> = {
      execute: vi.fn(),
      id: 'inverted-a',
      isAvailable: (context) => context.technologyId !== null,
      label: () => 'feature.techTreeCanvas:addFree',
    };
    const nodeOnlyOnTheZone: Action<CanvasActionContext> = {
      execute: vi.fn(),
      id: 'inverted-b',
      isAvailable: (context) => context.technologyId === null,
      label: () => 'feature.techTreeCanvas:delete',
    };
    const actions = [zoneOnlyOnANode, nodeOnlyOnTheZone];

    const node = renderMenu(actions, contextFor('fighter1'));
    expect(itemLabels()).toEqual(['Add technology here']);
    node.unmount();

    renderMenu(actions, contextFor(null));
    expect(itemLabels()).toEqual(['Delete']);
  });

  it('executes the clicked action against the context it was given', () => {
    const context = contextFor('fighter1');
    renderMenu(canvasActions, context);

    screen.getByRole('menuitem', { name: 'Delete' }).click();

    expect(context.openDelete).toHaveBeenCalledWith('fighter1');
  });
});
