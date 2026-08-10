// The result of `asset:image(spriteName)` (ZMT-40): the composed chain
// `spriteName → texture path (ZMT-39) → decoded pixels → nativeImage PNG data URL`.
// Chromium cannot display `.dds`, so main decodes and hands the renderer a PNG
// `data:` URL keyed by sprite name — the renderer asks by name and never sees a
// file path. Three clean outcomes, no error channel for the expected negatives:
// `ok` carries the base64 PNG `data:` URL an `<img>` can consume directly;
// `unresolved` mirrors ZMT-39's two-outcome asset resolution — the sprite name is
// unknown, or its texture is provided by no source; `unsupported` covers a texture
// that resolves on disk but cannot be decoded — a compressed FourCC (DXT/BC7) or
// any header shape the uncompressed decoder does not handle (Q72). The canvas
// renders a fallback for the two negatives; neither is a thrown error.
export type AssetImageResult =
  | AssetImageResolved
  | AssetImageUnresolved
  | AssetImageUnsupported;

interface AssetImageResolved {
  readonly dataUrl: string;
  readonly status: 'ok';
}

interface AssetImageUnresolved {
  readonly status: 'unresolved';
}

interface AssetImageUnsupported {
  readonly status: 'unsupported';
}
