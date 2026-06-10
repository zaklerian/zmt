import { Action } from '../action';

export interface EntityColumn {
  headerKey: string;
  id: string;
  sortable: boolean;
}

export interface EntityRow {
  readonly cells: Readonly<Record<string, string>>;
  id: string;
  state: 'error' | 'muted' | 'normal' | 'warning';
}

export interface EntitySortKey {
  columnId: string;
  direction: 'asc' | 'desc';
}

export interface EntityTableData {
  readonly actions?: readonly Action<EntityToolbarContext>[];
  readonly columns: readonly EntityColumn[];
  readonly defaultSort: readonly EntitySortKey[];
  readonly rows: readonly EntityRow[];
}

export interface EntityTableRecognizer {
  id: string;
  load: (filePath: string, translate: TranslateFn) => Promise<EntityTableData>;
  matches: (filePath: string) => boolean;
}

export interface EntityToolbarContext {
  readonly selectedRowId: null | string;
  readonly writable: boolean;
}

export type TranslateFn = (key: string) => string;
