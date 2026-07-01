import { createTheme, ThemeProvider } from '@mui/material';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { initI18n } from '../../../i18n';
import { ContentModeToggle } from './content-mode-toggle.component';

const theme = createTheme();

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

beforeAll(async () => {
  await initI18n('en');
});

describe('ContentModeToggle', () => {
  it('marks the active mode as pressed', () => {
    render(<ContentModeToggle mode="table" onChange={vi.fn()} />, { wrapper });

    expect(screen.getByRole('button', { name: 'Table view' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Code view' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('switches to code when the code button is clicked', () => {
    const onChange = vi.fn();
    render(<ContentModeToggle mode="table" onChange={onChange} />, { wrapper });

    fireEvent.click(screen.getByRole('button', { name: 'Code view' }));
    expect(onChange).toHaveBeenCalledWith('code');
  });

  it('switches back to table when the table button is clicked', () => {
    const onChange = vi.fn();
    render(<ContentModeToggle mode="code" onChange={onChange} />, { wrapper });

    fireEvent.click(screen.getByRole('button', { name: 'Table view' }));
    expect(onChange).toHaveBeenCalledWith('table');
  });

  it('labels the structured slot as the form view for a mod descriptor', () => {
    render(
      <ContentModeToggle
        mode="table"
        structuredView="form"
        onChange={vi.fn()}
      />,
      { wrapper },
    );

    expect(screen.getByRole('button', { name: 'Form view' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.queryByRole('button', { name: 'Table view' }),
    ).not.toBeInTheDocument();
  });

  it('switches back to the form slot when its button is clicked', () => {
    const onChange = vi.fn();
    render(
      <ContentModeToggle
        mode="code"
        structuredView="form"
        onChange={onChange}
      />,
      { wrapper },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Form view' }));
    expect(onChange).toHaveBeenCalledWith('table');
  });
});
