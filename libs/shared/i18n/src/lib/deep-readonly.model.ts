export type DeepReadonly<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => R
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
