import { FsNode, IpcError, isIpcError } from '@contracts';
import { useEffect, useState } from 'react';

import { modContentService } from '../services/mod-content.service';

const DEBOUNCE_MS = 250;

interface UseFileSearchOptions {
  readonly query: string;
  readonly root: null | string;
}

interface UseFileSearchResult {
  readonly error: IpcError | null;
  readonly loading: boolean;
  readonly results: readonly FsNode[];
}

const EMPTY_RESULTS: readonly FsNode[] = [];

export function useFileSearch({
  query,
  root,
}: UseFileSearchOptions): UseFileSearchResult {
  const isIdle = root === null || query.trim() === '';

  const [asyncState, setAsyncState] = useState<{
    readonly error: IpcError | null;
    readonly loading: boolean;
    readonly results: readonly FsNode[];
  }>({ error: null, loading: false, results: EMPTY_RESULTS });

  useEffect(() => {
    if (isIdle) return;

    let cancelled = false;

    const timer = setTimeout(() => {
      if (cancelled) return;
      setAsyncState((prev) => ({ ...prev, loading: true }));
      modContentService
        .searchFiles(root, query)
        .then((nodes) => {
          if (cancelled) return;
          setAsyncState({ error: null, loading: false, results: nodes });
        })
        .catch((rawError: unknown) => {
          if (cancelled) return;
          const ipcError: IpcError = isIpcError(rawError)
            ? rawError
            : { code: 500, message: String(rawError) };
          setAsyncState({
            error: ipcError,
            loading: false,
            results: EMPTY_RESULTS,
          });
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isIdle, root, query]);

  if (isIdle) {
    return { error: null, loading: false, results: EMPTY_RESULTS };
  }

  return asyncState;
}
