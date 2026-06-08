import { useRef, useState } from 'react';

interface UseAsyncCallbackResult<TArgs extends unknown[], TResult> {
  execute: (...args: TArgs) => Promise<TResult | undefined>;
  isPending: boolean;
}

export function useAsyncCallback<TArgs extends unknown[], TResult>(
  callback: (...args: TArgs) => Promise<TResult>,
): UseAsyncCallbackResult<TArgs, TResult> {
  const [isPending, setIsPending] = useState(false);
  const pendingRef = useRef(false);

  const execute = async (...args: TArgs): Promise<TResult | undefined> => {
    if (pendingRef.current) return undefined;
    pendingRef.current = true;
    setIsPending(true);
    try {
      return await callback(...args);
    } finally {
      pendingRef.current = false;
      setIsPending(false);
    }
  };

  return { execute, isPending };
}
