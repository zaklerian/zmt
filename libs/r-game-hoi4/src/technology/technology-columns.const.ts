import { EntityColumn } from '@r-core';

// Display order Name · Categories · Paths is meaningful, so it is kept as-is
// rather than alphabetized (R-CODE-9 array-literal carve-out).
export const TECHNOLOGY_COLUMNS: readonly EntityColumn[] = [
  {
    headerKey: 'plugin.hoi4:technology.columns.name',
    id: 'name',
    sortable: true,
  },
  {
    headerKey: 'plugin.hoi4:technology.columns.categories',
    id: 'categories',
    sortable: true,
  },
  {
    headerKey: 'plugin.hoi4:technology.columns.paths',
    id: 'paths',
    sortable: true,
  },
];
