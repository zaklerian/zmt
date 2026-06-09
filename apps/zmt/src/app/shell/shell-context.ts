import { createRequiredContext } from '../../shared/react';

export interface ShellContextValue {
  readonly activeModRootPath: null | string;
  readonly selectedPath: null | string;
}

const { Provider, useValue } =
  createRequiredContext<ShellContextValue>('useShell');

export const ShellContextProvider = Provider;
export const useShell = useValue;
