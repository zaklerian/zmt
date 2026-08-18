import { createTheme, ThemeProvider } from '@mui/material';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { initI18n } from '../../../i18n';
import { useAirTechTree, useTechnologyEdit } from '../hooks';
import { TechTreeCanvas } from './tech-tree-canvas.component';

vi.mock('../hooks', () => ({
  useAirTechTree: vi.fn(),
  useTechnologyEdit: vi.fn(),
}));
// Stub the node so rendering the ready canvas does not drag in the icon hook /
// window.api; this spec is about the canvas shell, the toggle, and selection wiring.
vi.mock('./tech-node.component', () => ({
  TechNode: ({ data }: { data: { token: string } }) => <div>{data.token}</div>,
}));

const theme = createTheme();
const mockUseAirTechTree = vi.mocked(useAirTechTree);
const mockUseTechnologyEdit = vi.mocked(useTechnologyEdit);
const editOpen = vi.fn();

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
  mockUseTechnologyEdit.mockReset();
  editOpen.mockReset();
  mockUseTechnologyEdit.mockReturnValue({
    close: vi.fn(),
    model: null,
    open: editOpen,
    status: 'idle',
  });
});

describe('TechTreeCanvas', () => {
  it('shows the loading message while fetching', () => {
    mockUseAirTechTree.mockReturnValue({
      allTechnologyIds: [],
      dependencyEdges: [],
      edges: [],
      nodes: [],
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
      nodes: [],
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
      nodes: [],
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
      nodes: [
        {
          data: { nodeKind: 'wide', token: 'fighter1' },
          id: 'fighter1',
          position: { x: 0, y: 0 },
          type: 'tech',
        },
      ],
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
      nodes: [
        {
          data: { nodeKind: 'wide', token: 'fighter1' },
          id: 'fighter1',
          position: { x: 0, y: 0 },
          type: 'tech',
        },
      ],
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
      nodes: [
        {
          data: { nodeKind: 'wide', token: 'fighter1' },
          id: 'fighter1',
          position: { x: 0, y: 0 },
          type: 'tech',
        },
      ],
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
});
