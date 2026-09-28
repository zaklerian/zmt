import type { IpcChannel, IpcChannelGroup, IpcChannelGroups } from './ipc-channel.const';
import type { IpcChannelResult, IpcRequest } from './ipc-contract.const';

export type IpcInvoke<C extends IpcChannel> =
  undefined extends IpcRequest<C>
    ? () => Promise<IpcChannelResult<C>>
    : (request: IpcRequest<C>) => Promise<IpcChannelResult<C>>;

export type AppApiGroup<G extends IpcChannelGroup> = {
  readonly [M in keyof IpcChannelGroups[G]]: IpcChannelGroups[G][M] extends IpcChannel
    ? IpcInvoke<IpcChannelGroups[G][M]>
    : never;
};

export type AppApi = {
  readonly [G in IpcChannelGroup]: AppApiGroup<G>;
};

export const APP_API_GLOBAL = 'api';
