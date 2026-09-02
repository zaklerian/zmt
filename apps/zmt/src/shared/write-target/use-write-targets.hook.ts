import { WriteKind, WriteTargets } from '@contracts';
import { useCallback, useEffect, useState } from 'react';

import { writeTargetsService } from './write-targets.service';

export interface UseWriteTargetsResult {
  readonly choose: (
    modId: string,
    kind: WriteKind,
    relativePath: null | string,
  ) => void;
  readonly targets: WriteTargets;
}

// The `writeTargets` preference as renderer state: read once on mount, and updated
// through the same store the settings panel writes to, so a target chosen there is
// live for the next write without a reload (the persistence itself is the store's —
// this holds no source of truth of its own).
//
// Fetch-once-hold, the same shape `useEnabledFeatures` uses over the same channel:
// a failed read is an EMPTY record, never a thrown render, because an unreadable
// preference must degrade to the call site's fallback rather than block a write
// (ADR 029 decision 5).
export function useWriteTargets(): UseWriteTargetsResult {
  const [targets, setTargets] = useState<WriteTargets>({});

  useEffect(() => {
    let cancelled = false;
    writeTargetsService
      .get()
      .then((stored) => {
        if (!cancelled) setTargets(stored);
      })
      .catch(() => {
        if (!cancelled) setTargets({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const choose = useCallback(
    (modId: string, kind: WriteKind, relativePath: null | string) => {
      void writeTargetsService
        .set(modId, kind, relativePath)
        .then(setTargets)
        .catch(() => {
          /* the store rejected the write; the held record stays as it was */
        });
    },
    [],
  );

  return { choose, targets };
}
