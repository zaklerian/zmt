import { createTheme, ThemeProvider } from '@mui/material';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { initI18n } from '../../../i18n';
import { CanvasToolbar } from './canvas-toolbar.component';

const theme = createTheme();
const onCategoriesChange = vi.fn();
const onSearchChange = vi.fn();

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

beforeAll(async () => {
  await initI18n('en');
});

beforeEach(() => {
  onCategoriesChange.mockReset();
  onSearchChange.mockReset();
});

describe('CanvasToolbar', () => {
  it('reports each keystroke of the search query to its owner', () => {
    render(
      <CanvasToolbar
        categories={[]}
        search=""
        selectedCategories={[]}
        onCategoriesChange={onCategoriesChange}
        onSearchChange={onSearchChange}
      />,
      { wrapper },
    );

    fireEvent.change(screen.getByLabelText('Search technologies'), {
      target: { value: 'fighter' },
    });

    expect(onSearchChange).toHaveBeenCalledWith('fighter');
  });

  // The options are the DECLARED vocabulary handed in from the `technologyCategory`
  // index — the toolbar offers what it is given and invents nothing.
  it('offers the declared categories and reports a multi-selection', () => {
    render(
      <CanvasToolbar
        categories={['air_equipment', 'naval_equipment']}
        search=""
        selectedCategories={['air_equipment']}
        onCategoriesChange={onCategoriesChange}
        onSearchChange={onSearchChange}
      />,
      { wrapper },
    );

    fireEvent.mouseDown(screen.getByLabelText('Categories'));

    expect(
      screen.getAllByRole('option').map((option) => option.textContent),
    ).toEqual(['air_equipment', 'naval_equipment']);

    fireEvent.click(screen.getByRole('option', { name: 'naval_equipment' }));

    // Multi-select: the second pick ADDS to the first, it does not replace it.
    expect(onCategoriesChange).toHaveBeenCalledWith([
      'air_equipment',
      'naval_equipment',
    ]);
  });
});
