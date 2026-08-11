import { createTheme, ThemeProvider } from '@mui/material';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { initI18n } from '../../../i18n';
import { useAirTechTree } from '../hooks';
import { TechTreeCanvas } from './tech-tree-canvas.component';

vi.mock('../hooks', () => ({ useAirTechTree: vi.fn() }));
// Stub the node so rendering the ready canvas does not drag in the icon hook /
// window.api; this spec is about the canvas shell, the toggle, and selection wiring.
vi.mock('./tech-node.component', () => ({ TechNode: () => <div /> }));

const theme = createTheme();
const mockUseAirTechTree = vi.mocked(useAirTechTree);

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
});

describe('TechTreeCanvas', () => {
  it('shows the loading message while fetching', () => {
    mockUseAirTechTree.mockReturnValue({
      dependencyEdges: [],
      edges: [],
      nodes: [],
      status: 'loading',
    });
    render(<TechTreeCanvas />, { wrapper });

    expect(screen.getByText('Loading the air tech tree…')).toBeInTheDocument();
  });

  it('shows the error message when the fetch failed', () => {
    mockUseAirTechTree.mockReturnValue({
      dependencyEdges: [],
      edges: [],
      nodes: [],
      status: 'error',
    });
    render(<TechTreeCanvas />, { wrapper });

    expect(
      screen.getByText('The air tech tree could not be loaded.'),
    ).toBeInTheDocument();
  });

  it('shows the empty message when the folder has no nodes', () => {
    mockUseAirTechTree.mockReturnValue({
      dependencyEdges: [],
      edges: [],
      nodes: [],
      status: 'ready',
    });
    render(<TechTreeCanvas />, { wrapper });

    expect(
      screen.getByText('No air technologies to display.'),
    ).toBeInTheDocument();
  });

  it('renders the dependencies overlay toggle off by default (default view = path only)', () => {
    mockUseAirTechTree.mockReturnValue({
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
      status: 'ready',
    });
    render(<TechTreeCanvas />, { wrapper });

    expect(screen.getByText('Show dependencies')).toBeInTheDocument();
    expect(screen.getByRole('switch')).not.toBeChecked();
  });

  it('toggles the dependencies overlay on click', () => {
    mockUseAirTechTree.mockReturnValue({
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
      status: 'ready',
    });
    render(<TechTreeCanvas />, { wrapper });

    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
  });
});
