import {
  IPC_ERROR_CODES,
  IPC_ERROR_SENTINEL,
  IpcError,
  isIpcError,
} from '@contracts';
import { ipcRenderer } from 'electron';

export async function invokeStructured<T>(
  channel: string,
  ...args: readonly unknown[]
): Promise<T> {
  try {
    return await ipcRenderer.invoke(channel, ...args);
  } catch (rawError: unknown) {
    throw parseIpcError(rawError);
  }
}

function parseIpcError(rawError: unknown): IpcError {
  const message =
    rawError instanceof Error ? rawError.message : String(rawError);
  const idx = message.lastIndexOf(IPC_ERROR_SENTINEL);

  if (idx !== -1) {
    const json = message.slice(idx + IPC_ERROR_SENTINEL.length);
    try {
      const parsed: unknown = JSON.parse(json);
      if (isIpcError(parsed)) return parsed;
    } catch {
      /* fall through */
    }
  }

  return {
    code: IPC_ERROR_CODES.INTERNAL,
    message: message || 'Unknown IPC error',
  };
}
