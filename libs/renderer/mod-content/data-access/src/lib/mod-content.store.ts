import type { FileSelection } from '@zmt/renderer/mod-content/util';

import { computed } from '@angular/core';
import { signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  type ContentKind,
  type StructuredView,
  type ViewMode,
} from '@zmt/renderer/mod-content/util';
import { pending } from '@zmt/renderer/pending/util';

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
  const structured = selection.recognizerId !== null || selection.isDescriptor;
  if (viewMode === 'code') {
    return structured || selection.support === 'editable' ? 'editor' : 'placeholder';
  }
  if (selection.recognizerId !== null) {
    return 'entityTable';
  }
  if (selection.isDescriptor) {
    return 'descriptor';
  }
  return selection.support === 'editable' ? 'editor' : 'placeholder';
}

export const ModContentStore = signalStore(
  { providedIn: 'root' },
  withState(INITIAL_STATE),
  withComputed(({ selection, viewMode }) => ({
    contentKind: computed(() => resolveContentKind(selection(), viewMode())),
    selectedPath: computed(() => selection()?.path ?? null),
    showsModeToggle: computed(() => {
      const current = selection();
      return current !== null && (current.recognizerId !== null || current.isDescriptor);
    }),
    structuredView: computed<StructuredView>(() =>
      selection()?.isDescriptor === true ? 'form' : 'table',
    ),
  })),
  withMethods(() => {
    const select: (selection: FileSelection | null) => void = () => pending('ZMT-A-5');
    const setViewMode: (mode: ViewMode) => void = () => pending('ZMT-A-5');
    return { select, setViewMode };
  }),
);
