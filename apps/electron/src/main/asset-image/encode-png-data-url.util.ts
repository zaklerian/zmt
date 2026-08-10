import { nativeImage } from 'electron';

import type { DdsDecoded } from './decode-dds.util';

// Encodes a canonical RGBA bitmap to a base64 PNG `data:` URL with Electron's
// built-in encoder (Q73) — no external image dependency. This is the one boundary
// that owns nativeImage's platform contract: `createFromBitmap` expects BGRA byte
// order (verified empirically for ZMT-40 — feeding RGBA red/green/blue produces an
// R/B-swapped PNG, feeding BGRA reproduces the intended colours including alpha),
// so the decoder's RGBA is swizzled to BGRA here rather than in the decoder, which
// stays platform-agnostic. `toDataURL()` yields `data:image/png;base64,…`, which
// an `<img src>` consumes directly.
export function encodePngDataUrl(bitmap: DdsDecoded): string {
  const { height, rgba, width } = bitmap;
  const bgra = Buffer.allocUnsafe(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    bgra[i] = rgba[i + 2];
    bgra[i + 1] = rgba[i + 1];
    bgra[i + 2] = rgba[i];
    bgra[i + 3] = rgba[i + 3];
  }
  return nativeImage.createFromBitmap(bgra, { height, width }).toDataURL();
}
