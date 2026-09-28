import type { FileSelection } from '@zmt/renderer/mod-content/util';

import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { type ContentKind, type ViewMode } from '@zmt/renderer/mod-content/util';

export interface ModContentState {
  readonly selection: FileSelection | null;
  readonly viewMode: ViewMode;
}

const INITIAL_STATE: ModContentState = {
  selection: null,
  viewMode: 'table',
};

export function resolveContentKind(
  selection: FileSelection | null,
  viewMode: ViewMode,
): ContentKind {
  if (selection === null) {
    return 'placeholder';
  }
  if (viewMode === 'code') {
    return selection.isDescriptor || selection.support === 'editable' ? 'editor' : 'placeholder';
  }
  if (selection.isDescriptor) {
    return 'descriptor';
  }
  return selection.support === 'editable' ? 'editor' : 'placeholder';
}

export function naturalViewMode(selection: FileSelection | null): ViewMode {
  return selection?.isDescriptor === true ? 'code' : 'table';
}

export const ModContentStore = signalStore(
  { providedIn: 'root' },
  withState(INITIAL_STATE),
  withComputed(({ selection, viewMode }) => ({
    contentKind: computed(() => resolveContentKind(selection(), viewMode())),
    selectedPath: computed(() => selection()?.path ?? null),
    showsModeToggle: computed(() => selection()?.isDescriptor === true),
  })),
  withMethods((store) => {
    const select = (selection: FileSelection | null): void => {
      patchState(store, (state) => ({
        selection,
        viewMode:
          selection?.path === state.selection?.path ? state.viewMode : naturalViewMode(selection),
      }));
    };
    const setViewMode = (viewMode: ViewMode): void => {
      patchState(store, { viewMode });
    };
    return { select, setViewMode };
  }),
);
