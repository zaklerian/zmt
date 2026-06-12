import { EntityColumn } from '@r-core';

// Display order Name · Category is meaningful, so it is kept as-is rather than
// alphabetized (R-CODE-9 array-literal carve-out).
export const MODULE_COLUMNS: readonly EntityColumn[] = [
  {
    headerKey: 'plugin.hoi4:module.columns.name',
    id: 'name',
    sortable: true,
  },
  {
    headerKey: 'plugin.hoi4:module.columns.category',
    id: 'category',
    sortable: true,
  },
];
