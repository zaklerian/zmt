import * as v from 'valibot';

import { IPC_ERROR_SCHEMA, type IpcError, type IpcErrorCode } from './ipc-error.schema';

export interface IpcOk<TData> {
  readonly data: TData;
  readonly ok: true;
}

export interface IpcFail {
  readonly error: IpcError;
  readonly ok: false;
}

export type IpcResult<TData> = IpcFail | IpcOk<TData>;

type OkSchema<TSchema extends v.GenericSchema> = v.ObjectSchema<
  { readonly data: TSchema; readonly ok: v.LiteralSchema<true, undefined> },
  undefined
>;

type FailSchema = v.ObjectSchema<
  { readonly error: typeof IPC_ERROR_SCHEMA; readonly ok: v.LiteralSchema<false, undefined> },
  undefined
>;

type ResultVariantSchema<TSchema extends v.GenericSchema> = v.VariantSchema<
  'ok',
  readonly [OkSchema<TSchema>, FailSchema],
  undefined
>;

export type IpcResultSchema<TSchema extends v.GenericSchema> = v.SchemaWithPipe<
  readonly [
    ResultVariantSchema<TSchema>,
    v.ReadonlyAction<v.InferOutput<ResultVariantSchema<TSchema>>>,
  ]
>;

export function ipcResultSchema<const TSchema extends v.GenericSchema>(
  data: TSchema,
): IpcResultSchema<TSchema> {
  return v.pipe(
    v.variant('ok', [
      v.object({ data, ok: v.literal(true) }),
      v.object({ error: IPC_ERROR_SCHEMA, ok: v.literal(false) }),
    ]),
    v.readonly(),
  );
}

export function ok<TData>(data: TData): IpcOk<TData> {
  return Object.freeze({ data, ok: true });
}

export function fail(code: IpcErrorCode, message: string): IpcFail {
  return Object.freeze({ error: Object.freeze({ code, message }), ok: false });
}
