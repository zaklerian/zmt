import {
  deepFreeze,
  fail,
  IPC_CONTRACTS,
  IPC_ERROR_CODES,
  type IpcChannel,
  type IpcChannelResult,
  type IpcRequest,
} from '@zmt/contracts';
import { ipcRenderer } from 'electron';
import * as v from 'valibot';

export type InvokeFn = <C extends IpcChannel>(
  channel: C,
  request: IpcRequest<C>,
) => Promise<IpcChannelResult<C>>;

export async function invoke<C extends IpcChannel>(
  channel: C,
  request: IpcRequest<C>,
): Promise<IpcChannelResult<C>> {
  let raw: unknown;
  try {
    raw = await ipcRenderer.invoke(channel, request);
  } catch {
    return fail(IPC_ERROR_CODES.internal, `IPC transport failed for ${channel}`);
  }
  const parsed = v.safeParse(IPC_CONTRACTS[channel].result, raw);
  if (!parsed.success) {
    return fail(IPC_ERROR_CODES.internal, `Malformed response for ${channel}`);
  }
  return deepFreeze(parsed.output);
}
