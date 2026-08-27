import { useEffect, useState } from 'react';

import { entityIndexClient } from '../../../shared/entity-index';

// The category filter's OPTIONS: the DECLARED vocabulary from ZMT-35's
// `technologyCategory` index, not the categories this folder's technologies
// happen to carry. A declared category no air tech uses is still offered —
// selecting it dims the whole folder, which is the honest answer, where a
// silently missing option would read as a bug.
//
// Fetch-once-hold like every other read this canvas makes (ADR 026 decision 2):
// the main side is the cache, the renderer holds a copy. A failed read leaves the
// picker empty rather than blocking the tree — the filter is an emphasis control,
// not a precondition for rendering.
//
// Sorted for a stable picker; the index returns resolution order, which carries no
// meaning to a reader scanning a list (R-CODE-9).
export function useTechnologyCategories(): readonly string[] {
  const [categories, setCategories] = useState<readonly string[]>([]);

  useEffect(() => {
    let cancelled = false;

    entityIndexClient
      .list('technologyCategory')
      .then((result) => {
        if (cancelled) return;
        setCategories(
          result.rows
            .map((row) => row.slim.id)
            .sort((left, right) => left.localeCompare(right)),
        );
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return categories;
}
