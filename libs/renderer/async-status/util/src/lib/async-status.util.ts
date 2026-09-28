import type { IpcError, IpcResult } from '@zmt/contracts';

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

export interface ResultHandlers<TData> {
  readonly failure: (error: IpcError) => void;
  readonly success: (data: TData) => void;
}

export function settle<TData>(result: IpcResult<TData>, handlers: ResultHandlers<TData>): void {
  if (result.ok) {
    handlers.success(result.data);
  } else {
    handlers.failure(result.error);
  }
}

export function statusOf<TData>(result: IpcResult<TData>): AsyncStatus {
  return result.ok ? ASYNC_SUCCESS : asyncError(result.error);
}

export function errorOf(status: AsyncStatus): IpcError | null {
  switch (status.kind) {
    case 'error':
      return status.error;
    case 'idle':
    case 'loading':
    case 'success':
      return null;
    default:
      return status satisfies never;
  }
}
