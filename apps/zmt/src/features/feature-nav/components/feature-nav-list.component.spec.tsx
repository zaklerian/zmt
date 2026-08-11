import { FeatureContribution } from '@contracts';
import { createTheme, ThemeProvider } from '@mui/material';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { FeatureNavList } from './feature-nav-list.component';

const theme = createTheme();

const AIRCRAFT: FeatureContribution = {
  enabled: true,
  featureId: 'aircraft',
  label: 'Aircraft',
};

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('FeatureNavList', () => {
  it('lists the enabled features and nothing else (no search, no tree)', () => {
    render(
      <FeatureNavList
        activeFeatureId={null}
        features={[AIRCRAFT]}
        onSelect={vi.fn()}
      />,
      { wrapper },
    );

    expect(screen.getByText('Aircraft')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('reports the selected feature to the parent', () => {
    const onSelect = vi.fn();
    render(
      <FeatureNavList
        activeFeatureId={null}
        features={[AIRCRAFT]}
        onSelect={onSelect}
      />,
      { wrapper },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Aircraft' }));
    expect(onSelect).toHaveBeenCalledWith('aircraft');
  });

  it('marks the active feature as selected', () => {
    render(
      <FeatureNavList
        activeFeatureId="aircraft"
        features={[AIRCRAFT]}
        onSelect={vi.fn()}
      />,
      { wrapper },
    );

    expect(screen.getByRole('button', { name: 'Aircraft' })).toHaveClass(
      'Mui-selected',
    );
  });
});
