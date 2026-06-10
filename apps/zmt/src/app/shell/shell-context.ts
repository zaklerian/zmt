import { FileSupport } from '@contracts';

import { createRequiredContext } from '../../shared/react';

export interface ShellContextValue {
  readonly activeModRootPath: null | string;
  confirmLeaveIfDirty: () => Promise<boolean>;
  consumeLeaveConfirmed: () => boolean;
  registerEditGuard: (predicate: () => boolean) => () => void;
  readonly selectedPath: null | string;
  selectedSupport: FileSupport | null;
  setViewMode: (mode: ViewMode) => void;
  signalLeaveConfirmed: () => void;
  viewMode: ViewMode;
}

export type ViewMode = 'code' | 'table';

const { Provider, useValue } =
  createRequiredContext<ShellContextValue>('useShell');

export const ShellContextProvider = Provider;
export const useShell = useValue;
