import { IPC_ERROR_SENTINEL, IpcError } from '@contracts';
import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { vi } from 'vitest';

export type CapturedHandler = (
  event: IpcMainInvokeEvent,
  ...args: readonly unknown[]
) => Promise<unknown>;

export function extractIpcError(error: unknown): IpcError {
  if (!(error instanceof Error)) {
    throw new Error(`expected Error, got ${String(error)}`);
  }
  if (!error.message.startsWith(IPC_ERROR_SENTINEL)) {
    throw new Error(`expected sentinel-prefixed Error, got: ${error.message}`);
  }
  return JSON.parse(error.message.slice(IPC_ERROR_SENTINEL.length)) as IpcError;
}

export function getCapturedHandler(channel: string): CapturedHandler {
  const calls = vi.mocked(ipcMain.handle).mock.calls;
  const match = calls.find(([c]) => c === channel);
  if (match === undefined) {
    throw new Error(`No handler registered for channel: ${channel}`);
  }
  return match[1] as CapturedHandler;
}

export function makeInvokeEvent(): IpcMainInvokeEvent {
  return { sender: {} } as unknown as IpcMainInvokeEvent;
}
