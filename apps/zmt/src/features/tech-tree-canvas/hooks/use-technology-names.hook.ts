import { technologyNameLocKey } from '@r-game-hoi4';
import { useEffect, useState } from 'react';

import { lookupLocalisation } from '../../../shared/localisation';

const EMPTY: ReadonlyMap<string, string> = new Map();

// The rendered nodes' PUBLIC NAMES, keyed by token (ZMT-54). The canvas holds slim
// rows, and a slim row deliberately carries no display name — the localised name
// lives in the loc layer — so searching by public name needs this one lookup over
// the tokens already on screen.
//
// No new channel and no new backend: `localisation:lookup` is the same read
// ZMT-50's edit form resolves a single technology's name through, called here for
// the node set instead of for one entity. A token no source localises simply has
// no entry and stays searchable by token (the base air techs' names live in
// vanilla, ZMT-50 grounding §4).
export function useTechnologyNames(
  tokens: readonly string[],
): ReadonlyMap<string, string> {
  const [names, setNames] = useState<ReadonlyMap<string, string>>(EMPTY);
  // The caller rebuilds the token array every render; the joined key is what makes
  // the effect fire on a CHANGED set rather than on a new array of the same tokens.
  const tokenKey = tokens.join('\n');

  useEffect(() => {
    // No nodes, nothing to look up. The held map is left as it is rather than
    // cleared: it is keyed by token, so a token that is gone is simply never asked
    // for, and clearing it here would be a setState the effect does not need.
    if (tokenKey === '') return;
    let cancelled = false;
    const tokenByLocKey = new Map(
      tokenKey.split('\n').map((token) => [technologyNameLocKey(token), token]),
    );

    lookupLocalisation([...tokenByLocKey.keys()])
      .then((result) => {
        if (cancelled) return;
        const resolved = new Map<string, string>();
        for (const entry of result.entries) {
          const token = tokenByLocKey.get(entry.key);
          if (token !== undefined) resolved.set(token, entry.value);
        }
        setNames(resolved);
      })
      .catch(() => {
        if (!cancelled) setNames(EMPTY);
      });

    return () => {
      cancelled = true;
    };
  }, [tokenKey]);

  return names;
}
