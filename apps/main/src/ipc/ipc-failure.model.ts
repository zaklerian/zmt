import { type IpcErrorCode } from '@zmt/contracts';

export class IpcFailure extends Error {
  public readonly code: IpcErrorCode;

  public constructor(code: IpcErrorCode, message: string) {
    super(message);
    this.name = 'IpcFailure';
    this.code = code;
  }
}

export function isErrno(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    Reflect.get(error, 'code') === code
  );
}
