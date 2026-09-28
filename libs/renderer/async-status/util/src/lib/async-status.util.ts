import type { IpcError } from '@zmt/contracts';

import type { AsyncStatus } from './async-status.model';

export const ASYNC_IDLE: AsyncStatus = { kind: 'idle' };

export const ASYNC_LOADING: AsyncStatus = { kind: 'loading' };

export const ASYNC_SUCCESS: AsyncStatus = { kind: 'success' };

export function asyncError(error: IpcError): AsyncStatus {
  return { error, kind: 'error' };
}

export function isSettled(status: AsyncStatus): boolean {
  switch (status.kind) {
    case 'error':
    case 'success':
      return true;
    case 'idle':
    case 'loading':
      return false;
    default:
      return status satisfies never;
  }
}
