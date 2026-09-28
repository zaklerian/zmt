import {
  type AppApi,
  deepFreeze,
  IPC_CHANNELS,
  type IpcChannel,
  type IpcRequest,
} from '@zmt/contracts';

import { type InvokeFn } from './ipc-invoke.util';

function bindChannel<C extends IpcChannel>(
  invokeFn: InvokeFn,
  channel: C,
): (request: IpcRequest<C>) => ReturnType<InvokeFn> {
  return async (request) => invokeFn(channel, request);
}

export function buildAppApi(invokeFn: InvokeFn): AppApi {
  const groups = Object.entries(IPC_CHANNELS).map(([group, methods]) => [
    group,
    Object.fromEntries(
      Object.entries(methods).map(([method, channel]) => [method, bindChannel(invokeFn, channel)]),
    ),
  ]);
  return deepFreeze(Object.fromEntries(groups) as AppApi);
}
