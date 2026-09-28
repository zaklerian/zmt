import type { IpcError } from '@zmt/contracts';

export type AsyncStatus =
  | { readonly error: IpcError; readonly kind: 'error' }
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'success' };

export type AsyncStatusKind = AsyncStatus['kind'];
