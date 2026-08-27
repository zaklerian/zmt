import type { NodeProps } from '@xyflow/react';

import { createTheme, ThemeProvider } from '@mui/material';
import { render, screen, waitFor } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { TechNodeData } from '../build-air-tree-flow.util';

import { assetImageClient } from '../../../shared/asset-image';
import { TechFlowNode } from '../build-air-tree-flow.util';
import { TechNode } from './tech-node.component';

const theme = createTheme();

function nodeProps(
  data: TechNodeData,
  selected = false,
): NodeProps<TechFlowNode> {
  return { data, selected } as unknown as NodeProps<TechFlowNode>;
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <ReactFlowProvider>{children}</ReactFlowProvider>
    </ThemeProvider>
  );
}

describe('TechNode', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the tech-token icon when the sprite resolves ok', async () => {
    vi.spyOn(assetImageClient, 'getImage').mockResolvedValue({
      dataUrl: 'data:image/png;base64,AAA',
      status: 'ok',
    });
    render(
      <TechNode
        {...nodeProps({ categories: [], nodeKind: 'wide', token: 'fighter1' })}
      />,
      {
        wrapper,
      },
    );

    const img = await screen.findByTestId('tech-node-icon');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,AAA');
    // Derived from the token, not the enabled equipment (Step 1 grounding).
    expect(assetImageClient.getImage).toHaveBeenCalledWith(
      'GFX_fighter1_medium',
    );
  });

  it('falls back to a framed placeholder for a no-icon tech, still labeled', async () => {
    vi.spyOn(assetImageClient, 'getImage').mockResolvedValue({
      status: 'unresolved',
    });
    render(
      <TechNode
        {...nodeProps({
          categories: [],
          nodeKind: 'sub',
          token: 'cv_fighter1',
        })}
      />,
      { wrapper },
    );

    expect(
      await screen.findByTestId('tech-node-icon-fallback'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('tech-node-icon')).not.toBeInTheDocument();
    // Never blank: the node still shows its label.
    expect(screen.getByText('cv_fighter1')).toBeInTheDocument();
  });

  it('distinguishes the three node kinds via nodeKind', async () => {
    vi.spyOn(assetImageClient, 'getImage').mockResolvedValue({
      status: 'unresolved',
    });

    for (const kind of ['wide', 'simple', 'sub'] as const) {
      const { unmount } = render(
        <TechNode
          {...nodeProps({ categories: [], nodeKind: kind, token: `t_${kind}` })}
        />,
        { wrapper },
      );
      await waitFor(() =>
        expect(screen.getByTestId('tech-node')).toHaveAttribute(
          'data-node-kind',
          kind,
        ),
      );
      unmount();
    }
  });

  it('reflects the selected state as a highlight flag (read-only)', async () => {
    vi.spyOn(assetImageClient, 'getImage').mockResolvedValue({
      status: 'unresolved',
    });

    const { rerender } = render(
      <TechNode
        {...nodeProps(
          { categories: [], nodeKind: 'wide', token: 'fighter1' },
          false,
        )}
      />,
      { wrapper },
    );
    await waitFor(() =>
      expect(screen.getByTestId('tech-node')).toHaveAttribute(
        'data-selected',
        'false',
      ),
    );

    rerender(
      <TechNode
        {...nodeProps(
          { categories: [], nodeKind: 'wide', token: 'fighter1' },
          true,
        )}
      />,
    );
    expect(screen.getByTestId('tech-node')).toHaveAttribute(
      'data-selected',
      'true',
    );
  });

  // ZMT-54: the node renders the emphasis it is handed and never removes itself —
  // a dimmed node is still in the document, still labeled, still edge-anchored.
  it('renders the search/filter emphasis without removing the node (ZMT-54)', async () => {
    vi.spyOn(assetImageClient, 'getImage').mockResolvedValue({
      status: 'unresolved',
    });

    const { rerender } = render(
      <TechNode
        {...nodeProps({
          categories: ['air_equipment'],
          dimmed: true,
          nodeKind: 'wide',
          token: 'naval_bomber1',
        })}
      />,
      { wrapper },
    );
    await waitFor(() =>
      expect(screen.getByTestId('tech-node')).toHaveAttribute(
        'data-dimmed',
        'true',
      ),
    );
    expect(screen.getByText('naval_bomber1')).toBeInTheDocument();

    rerender(
      <TechNode
        {...nodeProps({
          categories: ['air_equipment'],
          highlighted: true,
          nodeKind: 'wide',
          token: 'naval_bomber1',
        })}
      />,
    );
    expect(screen.getByTestId('tech-node')).toHaveAttribute(
      'data-highlighted',
      'true',
    );
    expect(screen.getByTestId('tech-node')).toHaveAttribute(
      'data-dimmed',
      'false',
    );
  });
});
