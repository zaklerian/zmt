import { IPC_ERROR_CODES } from '@contracts';

// Maps an IpcError code to its plugin.hoi4 module message key. Display-layer
// mapping, not invention (R-CODE-5); the caller resolves the key through t().
export function moduleErrorMessageKey(code: number): string {
  switch (code) {
    case IPC_ERROR_CODES.CONFLICT:
      return 'plugin.hoi4:module.errors.conflict';
    case IPC_ERROR_CODES.FORBIDDEN:
      return 'plugin.hoi4:module.errors.forbidden';
    case IPC_ERROR_CODES.NOT_FOUND:
      return 'plugin.hoi4:module.errors.notFound';
    default:
      return 'plugin.hoi4:module.errors.unknown';
  }
}
