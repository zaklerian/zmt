import {
  deepFreeze,
  fail,
  IPC_CONTRACTS,
  IPC_ERROR_CODES,
  type IpcChannel,
  type IpcChannelResult,
  type IpcPayload,
  type IpcResponse,
  ok,
} from '@zmt/contracts';
import { ipcMain } from 'electron';
import * as v from 'valibot';

import { IpcFailure } from './ipc-failure.model';
import { isTrustedSender, type SenderEvent } from './ipc-sender.util';

export type IpcHandler<C extends IpcChannel> = (
  payload: IpcPayload<C>,
  event: SenderEvent,
) => Promise<IpcResponse<C>>;

export interface IpcHandleOptions {
  readonly appOrigin: string;
}

export type RawIpcListener = (event: SenderEvent, request: unknown) => Promise<unknown>;

export function toFailure(channel: IpcChannel, error: unknown): IpcChannelResult<IpcChannel> {
  if (error instanceof IpcFailure) {
    return fail(error.code, error.message);
  }
  console.error(`Unexpected error in handler for ${channel}:`, error);
  return fail(IPC_ERROR_CODES.internal, 'Internal error');
}

export function createIpcListener<C extends IpcChannel>(
  channel: C,
  handler: IpcHandler<C>,
  options: IpcHandleOptions,
): (event: SenderEvent, request: unknown) => Promise<IpcChannelResult<C>> {
  const contract = IPC_CONTRACTS[channel];
  return async (event, request) => {
    if (!isTrustedSender(event, options.appOrigin)) {
      return fail(IPC_ERROR_CODES.forbidden, 'Untrusted sender');
    }
    const parsed = v.safeParse(contract.request, request);
    if (!parsed.success) {
      return fail(IPC_ERROR_CODES.badRequest, `Invalid request for ${channel}`);
    }
    const payload = deepFreeze(parsed.output) as IpcPayload<C>;
    let envelope: IpcChannelResult<C>;
    try {
      envelope = ok(await handler(payload, event));
    } catch (error: unknown) {
      envelope = toFailure(channel, error);
    }
    const validated = v.safeParse(contract.result, envelope);
    if (!validated.success) {
      console.error(`Handler for ${channel} produced a response outside its contract`);
      return fail(IPC_ERROR_CODES.internal, 'Internal error');
    }
    return deepFreeze(validated.output);
  };
}

export function ipcHandle<C extends IpcChannel>(
  channel: C,
  handler: IpcHandler<C>,
  options: IpcHandleOptions,
): void {
  const listener = createIpcListener(channel, handler, options);
  ipcMain.handle(channel, (event, request: unknown) => listener(event, request));
}
