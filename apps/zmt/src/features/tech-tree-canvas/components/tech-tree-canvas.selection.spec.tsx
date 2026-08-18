import { createTheme, ThemeProvider } from '@mui/material';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { initI18n } from '../../../i18n';
import { useAirTechTree } from '../hooks';
import { TechTreeCanvas } from './tech-tree-canvas.component';

vi.mock('../hooks', async (orig) => ({
  ...(await orig<typeof import('../hooks')>()),
  useAirTechTree: vi.fn(),
}));

const theme = createTheme();
const mockUseAirTechTree = vi.mocked(useAirTechTree);

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

beforeAll(async () => {
  await initI18n('en');
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
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: {
      asset: { getImage: vi.fn().mockResolvedValue({ status: 'unresolved' }) },
    },
    writable: true,
  });
});

beforeEach(() => {
  mockUseAirTechTree.mockReset();
});

describe('TechTreeCanvas selection', () => {
  it('highlights a node on click, with no mutation (read-only)', async () => {
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

    const node = await screen.findByTestId('tech-node');
    expect(node).toHaveAttribute('data-selected', 'false');

    fireEvent.click(node);

    await waitFor(() =>
      expect(screen.getByTestId('tech-node')).toHaveAttribute(
        'data-selected',
        'true',
      ),
    );
  });
});
