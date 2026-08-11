import { createTheme, ThemeProvider } from '@mui/material';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { initI18n } from '../../../i18n';
import { NavModeToggle } from './nav-mode-toggle.component';

const theme = createTheme();

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

beforeAll(async () => {
  await initI18n('en');
});

describe('NavModeToggle', () => {
  it('marks the active mode as pressed', () => {
    render(<NavModeToggle mode="file" onChange={vi.fn()} />, { wrapper });

    expect(
      screen.getByRole('button', { name: 'File navigation' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'Feature navigation' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches to nav mode when its button is clicked', () => {
    const onChange = vi.fn();
    render(<NavModeToggle mode="file" onChange={onChange} />, { wrapper });

    fireEvent.click(screen.getByRole('button', { name: 'Feature navigation' }));
    expect(onChange).toHaveBeenCalledWith('nav');
  });

  it('switches back to file mode when its button is clicked', () => {
    const onChange = vi.fn();
    render(<NavModeToggle mode="nav" onChange={onChange} />, { wrapper });

    fireEvent.click(screen.getByRole('button', { name: 'File navigation' }));
    expect(onChange).toHaveBeenCalledWith('file');
  });
});
