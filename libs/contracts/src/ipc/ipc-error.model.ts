export const IPC_ERROR_CODES = {
  BAD_REQUEST: 400,
  CONFLICT: 409,
  FORBIDDEN: 403,
  INTERNAL: 500,
  NOT_FOUND: 404,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA: 415,
} as const satisfies Record<string, number>;

export interface IpcError {
  readonly code: IpcErrorCode;
  readonly message: string;
}

export type IpcErrorCode =
  (typeof IPC_ERROR_CODES)[keyof typeof IPC_ERROR_CODES];

export function isIpcError(value: unknown): value is IpcError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof (value as { code: unknown }).code === 'number' &&
    'message' in value &&
    typeof (value as { message: unknown }).message === 'string'
  );
}
