// A declared `.gfx` sprite — the source-scoped index's fourth entity type (ADR
// 024, ZMT-39). A `.gfx` file declares many blocks all named `SpriteType` (and
// the `*SpriteType` variants BICE carries: `frameAnimatedSpriteType`,
// `corneredTileSpriteType`, `textSpriteType`), each distinguished by an inner
// `name` — the extractor keys every block by that name, never first-wins (the
// ZMT-E27 repeated-block read class). `id` IS that `name` (a `GFX_*` token). This
// entity carries only what a node/background render needs and NOT a resolved
// texture: `texturefile` is the RAW path as written (double-slashes, mixed case,
// `.tga`-while-`.dds`-ships and all), left for the standalone asset resolver
// (resolution B) to turn into an actual file on disk. `frames` is `noOfFrames`
// when declared (an animated strip), null for a single-frame sprite.
export interface SpriteEntity {
  readonly frames: null | number;
  readonly id: string;
  readonly texturefile: string;
}
