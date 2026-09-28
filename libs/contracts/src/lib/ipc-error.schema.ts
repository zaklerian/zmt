import * as v from 'valibot';

export const IPC_ERROR_CODES = {
  badRequest: 400,
  conflict: 409,
  forbidden: 403,
  internal: 500,
  notFound: 404,
  payloadTooLarge: 413,
} as const satisfies Record<string, number>;

export type IpcErrorCode = (typeof IPC_ERROR_CODES)[keyof typeof IPC_ERROR_CODES];

export const IPC_ERROR_CODE_LIST: readonly IpcErrorCode[] = Object.values(IPC_ERROR_CODES);

export const IPC_ERROR_CODE_SCHEMA = v.picklist(IPC_ERROR_CODE_LIST);

export const IPC_ERROR_SCHEMA = v.pipe(
  v.object({
    code: IPC_ERROR_CODE_SCHEMA,
    message: v.pipe(v.string(), v.minLength(1), v.maxLength(1024)),
  }),
  v.readonly(),
);

export type IpcError = v.InferOutput<typeof IPC_ERROR_SCHEMA>;
