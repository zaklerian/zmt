import type { IndexedEntity, SpriteEntity } from '@contracts';

import { ENTITY_REGISTRY } from '@e-game-hoi4';

import type { AssetResolution } from './asset-resolution.model';

import { entityIndexService } from '../entity-index/entity-index.service';
import { assetResolutionService } from './asset-resolution.service';

// The thin composition A→B (ZMT-39): `GFX ref → sprite (index) → raw texturefile →
// asset-resolve → actual path + provenance`. This is what a consumer calls to
// answer "where is the image for `GFX_air_techtree_bg`" — the geometry background
// ref today, tech-icon refs later (one mechanism, two consumers). It deliberately
// does NOT map a technology token to a sprite name (`GFX_<token>_medium` is a
// canvas convention, read-not-assumed when that consumer is built): the input IS a
// sprite name. It composes two distinct resolutions and keeps both provenances —
// the sprite's (which source DECLARED the sprite) and the asset's (which source
// PROVIDES the texture) — because they can differ: a mod may declare the sprite
// while the texture falls back to the vanilla reference.
export interface SpriteTextureResolution {
  readonly asset: AssetResolution;
  readonly sprite: IndexedEntity<SpriteEntity> | null;
}

// Resolves a sprite name to its texture file on disk. An unknown sprite name
// yields `{ sprite: null, asset: unresolved }`; a known sprite whose texture no
// source provides yields the sprite plus an `unresolved` asset — both are clean
// outcomes, never errors, matching resolution B's two-outcome contract.
async function resolve(spriteName: string): Promise<SpriteTextureResolution> {
  const { entities } = await entityIndexService.read(ENTITY_REGISTRY.sprite);
  const sprite = entities.find((indexed) => indexed.id === spriteName) ?? null;
  if (sprite === null) {
    return {
      asset: { requestedPath: '', status: 'unresolved' },
      sprite: null,
    };
  }
  return {
    asset: await assetResolutionService.resolve(sprite.entity.texturefile),
    sprite,
  };
}

export const spriteTextureService = {
  resolve,
} as const;
