import type { EntityAction } from './entity-action.model';

export const ENTITY_ROW_STATES = {
  error: 'error',
  muted: 'muted',
  normal: 'normal',
  warning: 'warning',
} as const satisfies Record<string, string>;

export type EntityRowState = (typeof ENTITY_ROW_STATES)[keyof typeof ENTITY_ROW_STATES];

export const SORT_DIRECTIONS = {
  asc: 'asc',
  desc: 'desc',
} as const satisfies Record<string, string>;

export type SortDirection = (typeof SORT_DIRECTIONS)[keyof typeof SORT_DIRECTIONS];

export interface EntityColumn {
  readonly id: string;
  readonly label: string;
  readonly sortable: boolean;
}

export interface EntityRow {
  readonly cells: Readonly<Record<string, string>>;
  readonly id: string;
  readonly state: EntityRowState;
}

export interface EntitySortKey {
  readonly columnId: string;
  readonly direction: SortDirection;
}

export interface EntityTableData {
  readonly actions: readonly EntityAction[];
  readonly columns: readonly EntityColumn[];
  readonly defaultSort: readonly EntitySortKey[];
  readonly rows: readonly EntityRow[];
}
