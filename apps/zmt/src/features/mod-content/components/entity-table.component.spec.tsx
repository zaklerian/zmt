import { createTheme, ThemeProvider } from '@mui/material';
import { EntityActionEnvironment, EntityTableData } from '@r-core';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { initI18n } from '../../../i18n';
import { EntityTable } from './entity-table.component';

const theme = createTheme();

const actionEnv: EntityActionEnvironment = {
  dismissForm: () => undefined,
  modal: {
    confirm: () => Promise.resolve(false),
    info: () => Promise.resolve(),
  },
  modId: null,
  presentEntityForm: () => undefined,
  presentForm: () => undefined,
  refresh: () => undefined,
  relativePath: '',
};

function makeData(): EntityTableData {
  return {
    columns: [
      { headerKey: 'mock.name', id: 'name', sortable: true },
      { headerKey: 'mock.kind', id: 'kind', sortable: true },
    ],
    defaultSort: [{ columnId: 'name', direction: 'asc' }],
    rows: [
      { cells: { kind: 'one', name: 'Bravo' }, id: 'r1', state: 'normal' },
      { cells: { kind: 'two', name: 'Alpha' }, id: 'r2', state: 'warning' },
      { cells: { kind: 'three', name: 'Charlie' }, id: 'r3', state: 'muted' },
      { cells: { kind: 'four', name: 'Delta' }, id: 'r4', state: 'error' },
    ],
  };
}

function renderedRowOrder(): readonly string[] {
  return screen
    .getAllByRole('row')
    .map((row) => within(row).queryAllByRole('gridcell')[0]?.textContent ?? '')
    .filter((text) => text.length > 0);
}

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

beforeAll(async () => {
  globalThis.ResizeObserver = class {
    disconnect(): void {
      // no-op: jsdom has no layout engine
    }
    observe(): void {
      // no-op: jsdom has no layout engine
    }
    unobserve(): void {
      // no-op: jsdom has no layout engine
    }
  };
  await initI18n('en');
});

describe('EntityTable', () => {
  let data: EntityTableData;

  beforeEach(() => {
    data = makeData();
  });

  it('renders the given columns and rows', () => {
    render(
      <EntityTable
        actionEnv={actionEnv}
        data={data}
        selectedRowId={null}
        writable={false}
        onSelectRow={vi.fn()}
      />,
      { wrapper },
    );

    expect(
      screen.getByRole('columnheader', { name: 'mock.name' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'mock.kind' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Delta')).toBeInTheDocument();
  });

  it('calls onSelectRow with the clicked row id', () => {
    const onSelectRow = vi.fn();
    render(
      <EntityTable
        actionEnv={actionEnv}
        data={data}
        selectedRowId={null}
        writable={false}
        onSelectRow={onSelectRow}
      />,
      { wrapper },
    );

    fireEvent.click(screen.getByText('Charlie'));
    expect(onSelectRow).toHaveBeenCalledWith('r3');
  });

  it('applies a distinct row class for each entity state', () => {
    const { container } = render(
      <EntityTable
        actionEnv={actionEnv}
        data={data}
        selectedRowId={null}
        writable={false}
        onSelectRow={vi.fn()}
      />,
      { wrapper },
    );

    expect(container.querySelector('.entity-row--normal')).not.toBeNull();
    expect(container.querySelector('.entity-row--warning')).not.toBeNull();
    expect(container.querySelector('.entity-row--muted')).not.toBeNull();
    expect(container.querySelector('.entity-row--error')).not.toBeNull();
  });

  it('reorders the displayed rows on sort without mutating the data', () => {
    render(
      <EntityTable
        actionEnv={actionEnv}
        data={data}
        selectedRowId={null}
        writable={false}
        onSelectRow={vi.fn()}
      />,
      { wrapper },
    );

    expect(renderedRowOrder()).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta']);

    fireEvent.click(screen.getByRole('columnheader', { name: 'mock.name' }));
    expect(renderedRowOrder()).toEqual(['Delta', 'Charlie', 'Bravo', 'Alpha']);

    expect(data.rows.map((row) => row.id)).toEqual(['r1', 'r2', 'r3', 'r4']);
  });
});
