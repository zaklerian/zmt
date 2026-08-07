import type { SpriteEntity, SpriteSlim } from '@contracts';

// The sprite `slimProjector` (ADR 024 decision 4): a sprite is already the minimal
// render set — its name, the raw `texturefile`, and its frame count — so the slim
// projection is the whole entity today. Kept as its own projector (not identity)
// so a later render-only field lands here without changing the full entity, and so
// `index:list('sprite')` rows stay typed to `SpriteSlim`.
export function projectSpriteSlim(entity: SpriteEntity): SpriteSlim {
  return {
    frames: entity.frames,
    id: entity.id,
    texturefile: entity.texturefile,
  };
}
