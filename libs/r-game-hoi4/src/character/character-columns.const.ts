import { EntityColumn } from '@r-core';

// Display order Name · Roles is meaningful, so it is kept as-is rather than
// alphabetized (R-CODE-9 array-literal carve-out).
export const CHARACTER_COLUMNS: readonly EntityColumn[] = [
  {
    headerKey: 'plugin.hoi4:character.columns.name',
    id: 'name',
    sortable: true,
  },
  {
    headerKey: 'plugin.hoi4:character.columns.roles',
    id: 'roles',
    sortable: true,
  },
];
