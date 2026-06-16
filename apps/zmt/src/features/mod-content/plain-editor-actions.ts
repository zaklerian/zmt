import { IpcError, isIpcError } from '@contracts';
import { Action } from '@r-core';

import { modContentService } from './services';

export interface PlainEditorErrorContext {
  retry: () => void;
}

// The editor surface context (ADR 015). `dirty` is the only field the render
// path (isAvailable/label) reads; the ref-backed capability fields are supplied
// only when the control fires (execute), so the host never passes a ref closure
// during render.
export interface PlainEditorSurfaceContext {
  dirty: boolean;
  filePath?: string;
  getText?: () => null | string;
  onSaved?: (text: string) => void;
  reset?: () => void;
  setSaveError?: (error: IpcError | null) => void;
}

export const plainEditorActions: {
  readonly cancel: Action<PlainEditorSurfaceContext>;
  readonly retry: Action<PlainEditorErrorContext>;
  readonly save: Action<PlainEditorSurfaceContext>;
} = {
  cancel: {
    execute: (context): void => context.reset?.(),
    id: 'plain-editor-cancel',
    isAvailable: (context) => context.dirty,
    label: () => 'app:actions.cancel',
  },

  retry: {
    execute: (context): void => context.retry(),
    id: 'plain-editor-retry',
    isAvailable: () => true,
    label: () => 'app:actions.retry',
  },

  save: {
    execute: async (context): Promise<void> => {
      const text = context.getText?.() ?? null;
      if (text === null || context.filePath === undefined) return;
      context.setSaveError?.(null);
      try {
        await modContentService.writeTextFile(context.filePath, text);
        context.onSaved?.(text);
      } catch (rawError: unknown) {
        const error: IpcError = isIpcError(rawError)
          ? rawError
          : { code: 500, message: String(rawError) };
        context.setSaveError?.(error);
      }
    },
    id: 'plain-editor-save',
    isAvailable: (context) => context.dirty,
    label: () => 'app:actions.save',
  },
};
