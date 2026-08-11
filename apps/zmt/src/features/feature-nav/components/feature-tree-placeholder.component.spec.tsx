import { FeatureContribution } from '@contracts';
import { createTheme, ThemeProvider } from '@mui/material';
import { render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeAll, describe, expect, it } from 'vitest';

import { initI18n } from '../../../i18n';
import { FeatureTreePlaceholder } from './feature-tree-placeholder.component';

const theme = createTheme();

const AIRCRAFT: FeatureContribution = {
  enabled: true,
  featureId: 'aircraft',
  label: 'Aircraft',
};

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

beforeAll(async () => {
  await initI18n('en');
});

describe('FeatureTreePlaceholder', () => {
  it('shows the empty state when no feature is active', () => {
    render(<FeatureTreePlaceholder feature={null} />, { wrapper });

    expect(
      screen.getByText('Select a feature to view its tree.'),
    ).toBeInTheDocument();
  });

  it('renders the placeholder for the active feature', () => {
    render(<FeatureTreePlaceholder feature={AIRCRAFT} />, { wrapper });

    expect(screen.getByText('Aircraft')).toBeInTheDocument();
    expect(screen.getByText('Tree renders here')).toBeInTheDocument();
  });
});
