import { EntityColumn } from '@r-core';

// Display order Id · Name · Category · Provinces is meaningful, so it is kept
// as-is rather than alphabetized (R-CODE-9 array-literal carve-out).
export const STATE_COLUMNS: readonly EntityColumn[] = [
  {
    headerKey: 'plugin.hoi4:state.columns.id',
    id: 'id',
    sortable: true,
  },
  {
    headerKey: 'plugin.hoi4:state.columns.name',
    id: 'name',
    sortable: true,
  },
  {
    headerKey: 'plugin.hoi4:state.columns.category',
    id: 'category',
    sortable: true,
  },
  {
    headerKey: 'plugin.hoi4:state.columns.provinces',
    id: 'provinces',
    sortable: true,
  },
];
