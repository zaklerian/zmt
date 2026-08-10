import type { AssetImageResult } from '@contracts';

// Thin typed renderer client over the `asset:image` channel (ZMT-40): sprite name
// → decoded PNG `data:` URL. The renderer asks by sprite name and never sees a
// file path — main resolves (ZMT-39), decodes the `.dds`, and returns pixels. The
// client adds no logic beyond the call; the canvas consumes `result.dataUrl` as an
// `<img src>` on `ok` and renders a fallback on `unresolved`/`unsupported`.
export const assetImageClient = {
  getImage(spriteName: string): Promise<AssetImageResult> {
    return window.api.asset.getImage(spriteName);
  },
};
