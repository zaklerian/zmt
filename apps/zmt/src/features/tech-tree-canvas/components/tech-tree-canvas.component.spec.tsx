import type { TechnologyDeletePlan } from '@contracts';

import { createTheme, ThemeProvider } from '@mui/material';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { initI18n } from '../../../i18n';
import {
  useAirTechTree,
  useTechnologyAdd,
  useTechnologyCategories,
  useTechnologyDelete,
  useTechnologyEdit,
  useTechnologyNames,
} from '../hooks';
import { TechTreeCanvas } from './tech-tree-canvas.component';

vi.mock('../hooks', () => ({
  useAirTechTree: vi.fn(),
  useTechnologyAdd: vi.fn(),
  useTechnologyCategories: vi.fn(),
  useTechnologyDelete: vi.fn(),
  useTechnologyEdit: vi.fn(),
  useTechnologyNames: vi.fn(),
}));
// Stub the node so rendering the ready canvas does not drag in the icon hook /
// window.api; this spec is about the canvas shell, the toggle, selection wiring,
// and the ZMT-54 emphasis the canvas resolves onto each node's data.
vi.mock('./tech-node.component', () => ({
  TechNode: ({
    data,
  }: {
    data: { dimmed?: boolean; highlighted?: boolean; token: string };
  }) => (
    <div
      data-dimmed={data.dimmed === true ? 'true' : 'false'}
      data-highlighted={data.highlighted === true ? 'true' : 'false'}
      data-testid={`node-${data.token}`}
    >
      {data.token}
    </div>
  ),
}));

const theme = createTheme();
const mockUseAirTechTree = vi.mocked(useAirTechTree);
const mockUseTechnologyAdd = vi.mocked(useTechnologyAdd);
const mockUseTechnologyCategories = vi.mocked(useTechnologyCategories);
const mockUseTechnologyDelete = vi.mocked(useTechnologyDelete);
const mockUseTechnologyEdit = vi.mocked(useTechnologyEdit);
const mockUseTechnologyNames = vi.mocked(useTechnologyNames);
const addOpenChild = vi.fn();
const addOpenFree = vi.fn();
const deleteOpen = vi.fn();
const editOpen = vi.fn();

const AIR_PATH = 'common/technologies/air_techs.txt';

const leafPlan: TechnologyDeletePlan = {
  blocked: [],
  inboundReferences: [],
  targets: [{ modId: 'bice', relativePath: AIR_PATH, token: 'fighter1' }],
};

const treePlan: TechnologyDeletePlan = {
  blocked: [],
  inboundReferences: [
    { referencedTokens: ['fighter2'], token: 'interceptor1' },
    { referencedTokens: ['fighter3'], token: 'naval_bomber1' },
  ],
  targets: ['fighter1', 'fighter2', 'fighter3'].map((token) => ({
    modId: 'bice',
    relativePath: AIR_PATH,
    token,
  })),
};

// One ready tree holding a single selectable node — the shape the mutation
// buttons are exercised against.
function readyWith(token: string): ReturnType<typeof useAirTechTree> {
  return {
    allTechnologyIds: [token],
    dependencyEdges: [],
    edges: [],
    folder: null,
    nodes: [
      {
        data: { categories: [], nodeKind: 'wide', token },
        id: token,
        position: { x: 0, y: 0 },
        type: 'tech',
      },
    ],
    reload: vi.fn(),
    rows: [],
    sources: {},
    status: 'ready',
  };
}

// A ready tree of two categorised nodes with public names — the shape the ZMT-54
// search and filter are exercised against.
function readyWithCategorised(): ReturnType<typeof useAirTechTree> {
  return {
    ...readyWith('early_fighter'),
    allTechnologyIds: ['early_fighter', 'naval_bomber1'],
    nodes: [
      {
        data: {
          categories: ['air_equipment'],
          nodeKind: 'wide',
          token: 'early_fighter',
        },
        id: 'early_fighter',
        position: { x: 0, y: 0 },
        type: 'tech',
      },
      {
        data: {
          categories: ['naval_equipment'],
          nodeKind: 'wide',
          token: 'naval_bomber1',
        },
        id: 'naval_bomber1',
        position: { x: 200, y: 0 },
        type: 'tech',
      },
    ],
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

beforeAll(async () => {
  await initI18n('en');
  // react-flow measures its container via ResizeObserver, absent in jsdom.
  globalThis.ResizeObserver ??= class {
    disconnect() {
      /* noop */
    }
    observe() {
      /* noop */
    }
    unobserve() {
      /* noop */
    }
  };
});

beforeEach(() => {
  mockUseAirTechTree.mockReset();
  mockUseTechnologyAdd.mockReset();
  mockUseTechnologyCategories.mockReset();
  mockUseTechnologyDelete.mockReset();
  mockUseTechnologyEdit.mockReset();
  mockUseTechnologyNames.mockReset();
  mockUseTechnologyCategories.mockReturnValue([]);
  mockUseTechnologyNames.mockReturnValue(new Map());
  addOpenChild.mockReset();
  addOpenFree.mockReset();
  deleteOpen.mockReset();
  editOpen.mockReset();
  mockUseTechnologyEdit.mockReturnValue({
    close: vi.fn(),
    model: null,
    open: editOpen,
    status: 'idle',
  });
  mockUseTechnologyAdd.mockReturnValue({
    close: vi.fn(),
    model: null,
    openChild: addOpenChild,
    openFree: addOpenFree,
    status: 'idle',
  });
  mockUseTechnologyDelete.mockReturnValue({
    cancel: vi.fn(),
    commit: vi.fn(),
    open: deleteOpen,
    plan: null,
    status: 'idle',
    token: null,
  });
});

describe('TechTreeCanvas', () => {
  it('shows the loading message while fetching', () => {
    mockUseAirTechTree.mockReturnValue({
      allTechnologyIds: [],
      dependencyEdges: [],
      edges: [],
      folder: null,
      nodes: [],
      reload: vi.fn(),
      rows: [],
      sources: {},
      status: 'loading',
    });
    render(<TechTreeCanvas />, { wrapper });

    expect(screen.getByText('Loading the air tech tree…')).toBeInTheDocument();
  });

  it('shows the error message when the fetch failed', () => {
    mockUseAirTechTree.mockReturnValue({
      allTechnologyIds: [],
      dependencyEdges: [],
      edges: [],
      folder: null,
      nodes: [],
      reload: vi.fn(),
      rows: [],
      sources: {},
      status: 'error',
    });
    render(<TechTreeCanvas />, { wrapper });

    expect(
      screen.getByText('The air tech tree could not be loaded.'),
    ).toBeInTheDocument();
  });

  it('shows the empty message when the folder has no nodes', () => {
    mockUseAirTechTree.mockReturnValue({
      allTechnologyIds: [],
      dependencyEdges: [],
      edges: [],
      folder: null,
      nodes: [],
      reload: vi.fn(),
      rows: [],
      sources: {},
      status: 'ready',
    });
    render(<TechTreeCanvas />, { wrapper });

    expect(
      screen.getByText('No air technologies to display.'),
    ).toBeInTheDocument();
  });

  it('renders the dependencies overlay toggle off by default (default view = path only)', () => {
    mockUseAirTechTree.mockReturnValue({
      allTechnologyIds: ['fighter1'],
      dependencyEdges: [],
      edges: [],
      folder: null,
      nodes: [
        {
          data: { categories: [], nodeKind: 'wide', token: 'fighter1' },
          id: 'fighter1',
          position: { x: 0, y: 0 },
          type: 'tech',
        },
      ],
      reload: vi.fn(),
      rows: [],
      sources: {},
      status: 'ready',
    });
    render(<TechTreeCanvas />, { wrapper });

    expect(screen.getByText('Show dependencies')).toBeInTheDocument();
    expect(screen.getByRole('switch')).not.toBeChecked();
  });

  it('toggles the dependencies overlay on click', () => {
    mockUseAirTechTree.mockReturnValue({
      allTechnologyIds: ['fighter1'],
      dependencyEdges: [],
      edges: [],
      folder: null,
      nodes: [
        {
          data: { categories: [], nodeKind: 'wide', token: 'fighter1' },
          id: 'fighter1',
          position: { x: 0, y: 0 },
          type: 'tech',
        },
      ],
      reload: vi.fn(),
      rows: [],
      sources: {},
      status: 'ready',
    });
    render(<TechTreeCanvas />, { wrapper });

    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
  });
  it('opens the edit form for the selected node (ZMT-50 step 2)', () => {
    mockUseAirTechTree.mockReturnValue({
      allTechnologyIds: ['fighter1'],
      dependencyEdges: [],
      edges: [],
      folder: null,
      nodes: [
        {
          data: { categories: [], nodeKind: 'wide', token: 'fighter1' },
          id: 'fighter1',
          position: { x: 0, y: 0 },
          type: 'tech',
        },
      ],
      reload: vi.fn(),
      rows: [],
      sources: {},
      status: 'ready',
    });
    render(<TechTreeCanvas />, { wrapper });

    // Disabled until a node is selected — ADR 026's selection is the precondition.
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();

    fireEvent.click(screen.getByText('fighter1'));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(editOpen).toHaveBeenCalledWith('fighter1');
  });

  it('adds a child of the selected node (ZMT-51 path 1)', () => {
    mockUseAirTechTree.mockReturnValue({
      allTechnologyIds: ['fighter1'],
      dependencyEdges: [],
      edges: [],
      folder: null,
      nodes: [
        {
          data: { categories: [], nodeKind: 'wide', token: 'fighter1' },
          id: 'fighter1',
          position: { x: 0, y: 0 },
          type: 'tech',
        },
      ],
      reload: vi.fn(),
      rows: [],
      sources: {},
      status: 'ready',
    });
    render(<TechTreeCanvas />, { wrapper });

    // Selection is the precondition for add-as-child, exactly as for Edit. With
    // nothing selected the panel row carries the shared action's zone label — the
    // panel dispatches the SAME action set as the menu (ZMT-54), so it labels
    // itself the same way; the selection is what enables it.
    expect(
      screen.getByRole('button', { name: 'Add technology here' }),
    ).toBeDisabled();

    fireEvent.click(screen.getByText('fighter1'));
    fireEvent.click(screen.getByRole('button', { name: 'Add prerequisite' }));

    expect(addOpenChild).toHaveBeenCalledWith('fighter1');
  });

  it('asks for the delete plan of the selected node (ZMT-52)', () => {
    mockUseAirTechTree.mockReturnValue(readyWith('fighter1'));
    render(<TechTreeCanvas />, { wrapper });

    // Selection is the precondition for Delete, exactly as for Edit and Add.
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();

    fireEvent.click(screen.getByText('fighter1'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(deleteOpen).toHaveBeenCalledWith('fighter1');
  });

  // Req 8: item-vs-tree is offered ONLY when the tree removes more than the item.
  it('confirms a leaf with a single delete option (ZMT-52)', () => {
    mockUseAirTechTree.mockReturnValue(readyWith('fighter1'));
    mockUseTechnologyDelete.mockReturnValue({
      cancel: vi.fn(),
      commit: vi.fn(),
      open: deleteOpen,
      plan: { item: leafPlan, tree: leafPlan },
      status: 'idle',
      token: 'fighter1',
    });
    render(<TechTreeCanvas />, { wrapper });

    expect(
      screen.getByRole('button', { name: 'Delete item' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete tree/ })).toBeNull();
  });

  // ZMT-53 gate 1: the node context menu carries all three verbs, and choosing
  // one runs the existing flow for the right-clicked technology.
  it('opens the AED context menu on a node right-click (ZMT-53)', () => {
    mockUseAirTechTree.mockReturnValue(readyWith('fighter1'));
    render(<TechTreeCanvas />, { wrapper });

    fireEvent.contextMenu(screen.getByText('fighter1'));

    expect(
      screen.getAllByRole('menuitem').map((item) => item.textContent),
    ).toEqual(['Edit', 'Add prerequisite', 'Delete']);

    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(editOpen).toHaveBeenCalledWith('fighter1');
  });

  // ZMT-53 gate 2: the zone context excludes the node-only verbs; gate 5 —
  // choosing Add hands the ZMT-51 free-placement path the projected click.
  it('opens the zone context menu on a pane right-click (ZMT-53)', () => {
    mockUseAirTechTree.mockReturnValue(readyWith('fighter1'));
    const { container } = render(<TechTreeCanvas />, { wrapper });
    const pane = container.querySelector('.react-flow__pane');
    if (pane === null) throw new Error('no react-flow pane');

    fireEvent.contextMenu(pane, { clientX: 220, clientY: 340 });

    expect(
      screen.getAllByRole('menuitem').map((item) => item.textContent),
    ).toEqual(['Add technology here']);

    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Add technology here' }),
    );
    expect(addOpenFree).toHaveBeenCalledTimes(1);
    expect(addOpenChild).not.toHaveBeenCalled();
    expect(editOpen).not.toHaveBeenCalled();
    expect(deleteOpen).not.toHaveBeenCalled();
  });

  it('offers item-vs-tree and warns about dangling references (ZMT-52)', () => {
    mockUseAirTechTree.mockReturnValue(readyWith('fighter1'));
    mockUseTechnologyDelete.mockReturnValue({
      cancel: vi.fn(),
      commit: vi.fn(),
      open: deleteOpen,
      plan: { item: leafPlan, tree: treePlan },
      status: 'idle',
      token: 'fighter1',
    });
    render(<TechTreeCanvas />, { wrapper });

    // The tree count is the SERVER-computed set size, rendered as returned.
    expect(
      screen.getByRole('button', { name: 'Delete tree (3)' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Delete tree removes 3 technologies/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/2 technologies reference the deleted set/),
    ).toBeInTheDocument();
  });

  // ZMT-54 gate 1: search HIGHLIGHTS, it never hides — the non-matching node is
  // still rendered, in place, undimmed.
  it('highlights search matches by token and hides nothing (ZMT-54)', () => {
    mockUseAirTechTree.mockReturnValue(readyWithCategorised());
    render(<TechTreeCanvas />, { wrapper });

    fireEvent.change(screen.getByLabelText('Search technologies'), {
      target: { value: 'fighter' },
    });

    expect(screen.getByTestId('node-early_fighter')).toHaveAttribute(
      'data-highlighted',
      'true',
    );
    // Rendered, not removed, and not dimmed either — search only adds emphasis.
    expect(screen.getByTestId('node-naval_bomber1')).toBeInTheDocument();
    expect(screen.getByTestId('node-naval_bomber1')).toHaveAttribute(
      'data-highlighted',
      'false',
    );
    expect(screen.getByTestId('node-naval_bomber1')).toHaveAttribute(
      'data-dimmed',
      'false',
    );
  });

  // ZMT-54 gate 1: the public name is the other half of the match, and it is the
  // one the user thinks in — a query matching only the localised name still hits.
  it('highlights a search match on the public name (ZMT-54)', () => {
    mockUseAirTechTree.mockReturnValue(readyWithCategorised());
    mockUseTechnologyNames.mockReturnValue(
      new Map([['early_fighter', 'Air Superiority']]),
    );
    render(<TechTreeCanvas />, { wrapper });

    fireEvent.change(screen.getByLabelText('Search technologies'), {
      target: { value: 'superiority' },
    });

    expect(screen.getByTestId('node-early_fighter')).toHaveAttribute(
      'data-highlighted',
      'true',
    );
    expect(screen.getByTestId('node-naval_bomber1')).toHaveAttribute(
      'data-highlighted',
      'false',
    );
  });

  // ZMT-54 gate 2: selecting a category DIMS what is outside it and hides nothing;
  // deselecting everything un-dims. Options come from the `technologyCategory`
  // index, matching runs against each node's own slim-row categories.
  it('dims technologies outside the selected categories and un-dims on deselect (ZMT-54)', () => {
    mockUseAirTechTree.mockReturnValue(readyWithCategorised());
    mockUseTechnologyCategories.mockReturnValue([
      'air_equipment',
      'naval_equipment',
    ]);
    render(<TechTreeCanvas />, { wrapper });

    fireEvent.mouseDown(screen.getByLabelText('Categories'));
    fireEvent.click(screen.getByRole('option', { name: 'air_equipment' }));

    expect(screen.getByTestId('node-early_fighter')).toHaveAttribute(
      'data-dimmed',
      'false',
    );
    // Dimmed, still rendered: hiding it would leave its edges dangling.
    expect(screen.getByTestId('node-naval_bomber1')).toBeInTheDocument();
    expect(screen.getByTestId('node-naval_bomber1')).toHaveAttribute(
      'data-dimmed',
      'true',
    );

    fireEvent.click(screen.getByRole('option', { name: 'air_equipment' }));

    expect(screen.getByTestId('node-naval_bomber1')).toHaveAttribute(
      'data-dimmed',
      'false',
    );
  });

  // ZMT-54 gate 3: the two compose — a node the filter would dim but the search
  // matched resolves to highlighted and undimmed. Search wins.
  it('resolves a filter-dimmed but search-matched node to highlighted (ZMT-54)', () => {
    mockUseAirTechTree.mockReturnValue(readyWithCategorised());
    mockUseTechnologyCategories.mockReturnValue([
      'air_equipment',
      'naval_equipment',
    ]);
    render(<TechTreeCanvas />, { wrapper });

    fireEvent.mouseDown(screen.getByLabelText('Categories'));
    fireEvent.click(screen.getByRole('option', { name: 'air_equipment' }));
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    fireEvent.change(screen.getByLabelText('Search technologies'), {
      target: { value: 'naval' },
    });

    const bomber = screen.getByTestId('node-naval_bomber1');
    expect(bomber).toHaveAttribute('data-highlighted', 'true');
    expect(bomber).toHaveAttribute('data-dimmed', 'false');
  });

  // ZMT-54 gate 4: one action source. The panel row and the context menu render
  // the same verbs, in the same order, with the same labels, for the same context —
  // and the panel button dispatches the action, not a hook of its own.
  it('drives the panel AED buttons from the same canvasActions as the menu (ZMT-54)', () => {
    mockUseAirTechTree.mockReturnValue(readyWith('fighter1'));
    render(<TechTreeCanvas />, { wrapper });

    fireEvent.click(screen.getByText('fighter1'));

    fireEvent.contextMenu(screen.getByText('fighter1'));
    const menuLabels = screen
      .getAllByRole('menuitem')
      .map((item) => item.textContent);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    // Same set, same order — the menu renders `canvasActions`, and so does the panel.
    expect(menuLabels).toEqual(['Edit', 'Add prerequisite', 'Delete']);
    for (const label of menuLabels) {
      expect(screen.getByRole('button', { name: label ?? '' })).toBeEnabled();
    }

    // And the panel button dispatches the action, reaching the same flow.
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(deleteOpen).toHaveBeenCalledWith('fighter1');
  });
});
