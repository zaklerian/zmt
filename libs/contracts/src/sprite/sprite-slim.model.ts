// The slim projection of a `.gfx` sprite (ADR 024 decision 4): the minimal render
// set an `index:list('sprite')` row carries — the sprite name, the raw
// `texturefile`, and its frame count. Identical in shape to the full entity today
// (a sprite is already thin), but kept as its own type so the two evolve
// independently — a later render-only field (frame size, tiling) would land on the
// slim row without necessarily changing the full entity. Provenance is NOT here;
// it rides the `IndexSlimRow` wrapper.
export interface SpriteSlim {
  readonly frames: null | number;
  readonly id: string;
  readonly texturefile: string;
}
