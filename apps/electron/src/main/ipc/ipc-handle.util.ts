import {
  IPC_ERROR_CODES,
  IPC_ERROR_SENTINEL,
  IpcError,
  isIpcError,
} from '@contracts';
import { ipcMain, IpcMainInvokeEvent } from 'electron';

export function ipcHandle<TResult>(
  channel: string,
  handler: (
    event: IpcMainInvokeEvent,
    ...args: readonly unknown[]
  ) => Promise<TResult>,
): void {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await handler(event, ...args);
    } catch (error: unknown) {
      if (isIpcError(error)) {
        throw new Error(`${IPC_ERROR_SENTINEL}${JSON.stringify(error)}`);
      }

      console.error(`Unexpected error in handler for ${channel}:`, error);
      const wrapped: IpcError = {
        code: IPC_ERROR_CODES.INTERNAL,
        message: 'Internal error',
      };
      throw new Error(`${IPC_ERROR_SENTINEL}${JSON.stringify(wrapped)}`);
    }
  });
}
