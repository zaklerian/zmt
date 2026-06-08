import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAsyncCallback } from './use-async-callback.hook';

describe('useAsyncCallback', () => {
  it('starts with isPending = false', () => {
    const { result } = renderHook(() => useAsyncCallback(async () => 'done'));
    expect(result.current.isPending).toBe(false);
  });

  it('flips isPending true while a call is in flight and back to false on resolve', async () => {
    let resolve: (value: string) => void = () => undefined;
    const callback = vi.fn(() => new Promise<string>((r) => (resolve = r)));
    const { result } = renderHook(() => useAsyncCallback(callback));

    let promise!: Promise<string | undefined>;
    act(() => {
      promise = result.current.execute();
    });
    await waitFor(() => expect(result.current.isPending).toBe(true));

    await act(async () => {
      resolve('done');
      await promise;
    });

    expect(result.current.isPending).toBe(false);
    await expect(promise).resolves.toBe('done');
  });

  it('flips isPending back to false even when the callback rejects', async () => {
    const callback = vi.fn(async () => {
      throw new Error('boom');
    });
    const { result } = renderHook(() => useAsyncCallback(callback));

    await act(async () => {
      await result.current.execute().catch(() => undefined);
    });

    expect(result.current.isPending).toBe(false);
  });

  it('propagates the rejection value to the caller', async () => {
    const cause = new Error('boom');
    const { result } = renderHook(() =>
      useAsyncCallback(async () => {
        throw cause;
      }),
    );

    let captured: unknown = null;
    await act(async () => {
      try {
        await result.current.execute();
      } catch (error: unknown) {
        captured = error;
      }
    });
    expect(captured).toBe(cause);
  });

  it('ignores subsequent execute calls while one is in flight (returns undefined)', async () => {
    let resolveFirst: (value: string) => void = () => undefined;
    const callback = vi.fn(() => {
      if (callback.mock.calls.length === 1) {
        return new Promise<string>((r) => (resolveFirst = r));
      }
      return Promise.resolve('second');
    });
    const { result } = renderHook(() => useAsyncCallback(callback));

    let firstPromise!: Promise<string | undefined>;
    let secondPromise!: Promise<string | undefined>;
    act(() => {
      firstPromise = result.current.execute();
    });
    await waitFor(() => expect(result.current.isPending).toBe(true));
    act(() => {
      secondPromise = result.current.execute();
    });

    expect(callback).toHaveBeenCalledTimes(1);
    await expect(secondPromise).resolves.toBeUndefined();

    await act(async () => {
      resolveFirst('first');
      await firstPromise;
    });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('forwards arguments through to the wrapped callback', async () => {
    const callback = vi.fn(async (a: number, b: string) => `${String(a)}:${b}`);
    const { result } = renderHook(() => useAsyncCallback(callback));

    let value: string | undefined;
    await act(async () => {
      value = await result.current.execute(42, 'x');
    });

    expect(callback).toHaveBeenCalledWith(42, 'x');
    expect(value).toBe('42:x');
  });

  it('does not log a React act/unmount warning when unmounted mid-flight', async () => {
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    let resolve: (value: string) => void = () => undefined;
    const { result, unmount } = renderHook(() =>
      useAsyncCallback(() => new Promise<string>((r) => (resolve = r))),
    );

    let promise!: Promise<string | undefined>;
    act(() => {
      promise = result.current.execute();
    });
    await waitFor(() => expect(result.current.isPending).toBe(true));

    unmount();
    resolve('done');
    await promise;

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
