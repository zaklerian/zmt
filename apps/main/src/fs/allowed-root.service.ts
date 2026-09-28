import { IPC_ERROR_CODES } from '@zmt/contracts';

import { IpcFailure } from '../ipc/ipc-failure.model';
import { type PathGuardOptions, toSafePath } from './path-guard.util';
import { type SafePath } from './safe-path.model';

export interface AllowedRoot {
  readonly clear: () => void;
  readonly get: () => null | string;
  readonly guard: (target: string, options?: PathGuardOptions) => Promise<SafePath>;
  readonly set: (root: string) => void;
}

export function createAllowedRoot(initial: null | string = null): AllowedRoot {
  let root = initial;
  const service: AllowedRoot = {
    clear: () => {
      root = null;
    },
    get: () => root,
    guard: async (target, options) => {
      if (root === null) {
        throw new IpcFailure(IPC_ERROR_CODES.forbidden, 'No root folder is open');
      }
      return toSafePath(root, target, options);
    },
    set: (next) => {
      root = next;
    },
  };
  return Object.freeze(service);
}
