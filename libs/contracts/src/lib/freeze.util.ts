export type DeepReadonly<T> = T extends (...args: readonly never[]) => unknown
  ? T
  : T extends Uint8Array
    ? T
    : T extends readonly (infer U)[]
      ? readonly DeepReadonly<U>[]
      : T extends object
        ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
        : T;

export function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (
    (typeof value !== 'object' && typeof value !== 'function') ||
    value === null ||
    ArrayBuffer.isView(value)
  ) {
    return value as DeepReadonly<T>;
  }
  if (!Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Reflect.ownKeys(value)) {
      deepFreeze(Reflect.get(value, key));
    }
  }
  return value as DeepReadonly<T>;
}
