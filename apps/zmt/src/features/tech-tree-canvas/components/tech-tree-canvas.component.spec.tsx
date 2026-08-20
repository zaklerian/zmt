import type { TechnologyDeletePlan } from '@contracts';

import { createTheme, ThemeProvider } from '@mui/material';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { initI18n } from '../../../i18n';
import {
  useAirTechTree,
  useTechnologyAdd,
  useTechnologyDelete,
  useTechnologyEdit,
} from '../hooks';
import { TechTreeCanvas } from './tech-tree-canvas.component';

vi.mock('../hooks', () => ({
  useAirTechTree: vi.fn(),
  useTechnologyAdd: vi.fn(),
  useTechnologyDelete: vi.fn(),
  useTechnologyEdit: vi.fn(),
}));
// Stub the node so rendering the ready canvas does not drag in the icon hook /
// window.api; this spec is about the canvas shell, the toggle, and selection wiring.
vi.mock('./tech-node.component', () => ({
  TechNode: ({ data }: { data: { token: string } }) => <div>{data.token}</div>,
}));

const theme = createTheme();
const mockUseAirTechTree = vi.mocked(useAirTechTree);
const mockUseTechnologyAdd = vi.mocked(useTechnologyAdd);
const mockUseTechnologyDelete = vi.mocked(useTechnologyDelete);
const mockUseTechnologyEdit = vi.mocked(useTechnologyEdit);
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
        data: { nodeKind: 'wide', token },
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
  mockUseTechnologyDelete.mockReset();
  mockUseTechnologyEdit.mockReset();
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
          data: { nodeKind: 'wide', token: 'fighter1' },
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
          data: { nodeKind: 'wide', token: 'fighter1' },
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
          data: { nodeKind: 'wide', token: 'fighter1' },
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
          data: { nodeKind: 'wide', token: 'fighter1' },
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

    // Selection is the precondition for add-as-child, exactly as for Edit.
    expect(
      screen.getByRole('button', { name: 'Add prerequisite' }),
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
});
