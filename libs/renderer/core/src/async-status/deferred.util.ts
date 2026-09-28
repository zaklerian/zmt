export interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly reject: (reason: unknown) => void;
  readonly resolve: (value: T) => void;
}

export function deferred<T>(): Deferred<T> {
  const { promise, reject, resolve } = Promise.withResolvers<T>();
  return { promise, reject, resolve };
}

export function flushPromises(): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}
