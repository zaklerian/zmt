import * as v from 'valibot';

import { FS_NODE_LIST_SCHEMA } from './fs-node.schema';
import {
  FOLDER_DIALOG_RESPONSE_SCHEMA,
  LIST_DIRECTORY_REQUEST_SCHEMA,
  READ_TEXT_FILE_REQUEST_SCHEMA,
  SEARCH_FILES_REQUEST_SCHEMA,
  WRITE_BINARY_FILE_REQUEST_SCHEMA,
  WRITE_TEXT_FILE_REQUEST_SCHEMA,
} from './fs-request.schema';
import { GAME_PLUGIN_LIST_SCHEMA } from './game-plugin.schema';
import { IPC_CHANNELS, type IpcChannel } from './ipc-channel.const';
import { type IpcResult, ipcResultSchema, type IpcResultSchema } from './ipc-result.schema';

export interface IpcContract<TRequest extends v.GenericSchema, TResponse extends v.GenericSchema> {
  readonly request: TRequest;
  readonly response: TResponse;
  readonly result: IpcResultSchema<TResponse>;
}

interface IpcContractShape {
  readonly request: v.GenericSchema;
  readonly response: v.GenericSchema;
  readonly result: v.GenericSchema;
}

function contract<const TRequest extends v.GenericSchema, const TResponse extends v.GenericSchema>(
  request: TRequest,
  response: TResponse,
): IpcContract<TRequest, TResponse> {
  return Object.freeze({ request, response, result: ipcResultSchema(response) });
}

export const IPC_CONTRACTS = Object.freeze({
  [IPC_CHANNELS.fs.listDirectory]: contract(LIST_DIRECTORY_REQUEST_SCHEMA, FS_NODE_LIST_SCHEMA),
  [IPC_CHANNELS.fs.openFolderDialog]: contract(v.undefined(), FOLDER_DIALOG_RESPONSE_SCHEMA),
  [IPC_CHANNELS.fs.readTextFile]: contract(READ_TEXT_FILE_REQUEST_SCHEMA, v.string()),
  [IPC_CHANNELS.fs.searchFiles]: contract(SEARCH_FILES_REQUEST_SCHEMA, FS_NODE_LIST_SCHEMA),
  [IPC_CHANNELS.fs.writeBinaryFile]: contract(WRITE_BINARY_FILE_REQUEST_SCHEMA, v.null()),
  [IPC_CHANNELS.fs.writeTextFile]: contract(WRITE_TEXT_FILE_REQUEST_SCHEMA, v.null()),
  [IPC_CHANNELS.plugins.list]: contract(v.undefined(), GAME_PLUGIN_LIST_SCHEMA),
  [IPC_CHANNELS.system.ping]: contract(v.undefined(), v.literal('pong')),
} as const satisfies Record<IpcChannel, IpcContractShape>);

export type IpcContracts = typeof IPC_CONTRACTS;

export type IpcRequest<C extends IpcChannel> = v.InferInput<IpcContracts[C]['request']>;

export type IpcPayload<C extends IpcChannel> = v.InferOutput<IpcContracts[C]['request']>;

export type IpcResponse<C extends IpcChannel> = v.InferOutput<IpcContracts[C]['response']>;

export type IpcChannelResult<C extends IpcChannel> = IpcResult<IpcResponse<C>>;
