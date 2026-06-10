import { EntityColumn } from '@r-recognizer';

// Display order Name · Kind · Type · Domain is meaningful, so it is kept as-is
// rather than alphabetized (R-CODE-9 array-literal carve-out).
export const EQUIPMENT_COLUMNS: readonly EntityColumn[] = [
  {
    headerKey: 'plugin.hoi4:equipment.columns.name',
    id: 'name',
    sortable: true,
  },
  {
    headerKey: 'plugin.hoi4:equipment.columns.kind',
    id: 'kind',
    sortable: true,
  },
  {
    headerKey: 'plugin.hoi4:equipment.columns.type',
    id: 'type',
    sortable: true,
  },
  {
    headerKey: 'plugin.hoi4:equipment.columns.domain',
    id: 'domain',
    sortable: true,
  },
];
