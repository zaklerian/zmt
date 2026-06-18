import { EntityColumn } from '@r-core';

// Display order Name · Subideologies is meaningful, so it is kept as-is rather
// than alphabetized (R-CODE-9 array-literal carve-out).
export const IDEOLOGY_COLUMNS: readonly EntityColumn[] = [
  {
    headerKey: 'plugin.hoi4:ideology.columns.name',
    id: 'name',
    sortable: true,
  },
  {
    headerKey: 'plugin.hoi4:ideology.columns.types',
    id: 'types',
    sortable: true,
  },
];
