import type { ReactNode } from 'react';

import { Action } from '../action';
import { ModalService } from '../modal';

// Renderer capabilities an entity action needs at execute time but cannot reach
// from a plugin lib: the active file's location for a write/delete, the modal
// service, a list refresh, and a slot to mount a plugin-owned edit form. Carried
// on the toolbar context per ADR 015 (capabilities ride the context, not the
// action signature).
export interface EntityActionEnvironment {
  readonly dismissForm: () => void;
  readonly modal: ModalService;
  readonly modId: null | string;
  readonly presentForm: (node: ReactNode) => void;
  readonly refresh: () => void;
  readonly relativePath: string;
}

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

export interface EntityToolbarContext extends EntityActionEnvironment {
  readonly selectedRowId: null | string;
  readonly writable: boolean;
}

export type TranslateFn = (key: string) => string;
