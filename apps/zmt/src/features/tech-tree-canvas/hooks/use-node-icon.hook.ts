import type { AssetImageResult } from '@contracts';

import { useEffect, useState } from 'react';

import { assetImageClient } from '../../../shared/asset-image';

// Pre-resolve state plus the three `asset:image` outcomes (ZMT-40). `loading`
// covers the in-flight fetch; `ok` carries the PNG data URL an `<img>` consumes;
// `unresolved`/`unsupported` are the two clean negatives the node renders as a
// labeled fallback. A rejected IPC call collapses to `unresolved` — the node still
// renders, never crashes.
export type NodeIcon = { readonly status: 'loading' } | AssetImageResult;

const LOADING: NodeIcon = { status: 'loading' };

// Loads one node's icon by sprite name over the `asset:image` channel and holds
// the result in React state (fetch-once-hold, no store — ADR 026 D2). The sprite
// name is derived from the technology token by `nodeIconSprite`; this hook only
// fetches. Re-fetches if the sprite name changes; cancels on unmount so a late
// resolve does not set state on a gone node.
export function useNodeIcon(spriteName: string): NodeIcon {
  const [icon, setIcon] = useState<NodeIcon>(LOADING);

  useEffect(() => {
    let cancelled = false;

    assetImageClient
      .getImage(spriteName)
      .then((result) => {
        if (!cancelled) setIcon(result);
      })
      .catch(() => {
        if (!cancelled) setIcon({ status: 'unresolved' });
      });

    return () => {
      cancelled = true;
    };
  }, [spriteName]);

  return icon;
}
