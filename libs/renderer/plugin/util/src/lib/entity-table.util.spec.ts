import type { EntityAction } from './entity-action.model';
import type { EntityRow } from './entity-table.model';

import { sortEntityRows, toEntityActionViews } from './entity-table.util';

const ROWS: readonly EntityRow[] = [
  { cells: { category: 'b', name: 'zeta' }, id: 'zeta', state: 'normal' },
  { cells: { category: 'a', name: 'alpha' }, id: 'alpha', state: 'muted' },
  { cells: { category: 'a', name: 'beta' }, id: 'beta', state: 'warning' },
];

describe('sortEntityRows', () => {
  it('returns the same rows when no sort key is given', () => {
    expect(sortEntityRows(ROWS, [])).toBe(ROWS);
  });

  it('sorts by each key in turn with its direction', () => {
    const sorted = sortEntityRows(ROWS, [
      { columnId: 'category', direction: 'asc' },
      { columnId: 'name', direction: 'desc' },
    ]);
    expect(sorted.map((row) => row.id)).toEqual(['beta', 'alpha', 'zeta']);
    expect(ROWS.map((row) => row.id)).toEqual(['zeta', 'alpha', 'beta']);
  });

  it('treats a missing cell as an empty string', () => {
    const sorted = sortEntityRows(ROWS, [{ columnId: 'missing', direction: 'asc' }]);
    expect(sorted.map((row) => row.id)).toEqual(['zeta', 'alpha', 'beta']);
  });
});

describe('toEntityActionViews', () => {
  it('resolves availability against the current selection', () => {
    const edit: EntityAction = {
      execute: () => Promise.resolve({ kind: 'none' }),
      id: 'edit',
      isAvailable: ({ selectedRowId, writable }) => writable && selectedRowId !== null,
      label: 'Edit',
    };
    expect(
      toEntityActionViews([edit], { filePath: '/f', selectedRowId: null, writable: true }),
    ).toEqual([{ available: false, id: 'edit', label: 'Edit' }]);
    expect(
      toEntityActionViews([edit], { filePath: '/f', selectedRowId: 'x', writable: true }),
    ).toEqual([{ available: true, id: 'edit', label: 'Edit' }]);
  });
});
