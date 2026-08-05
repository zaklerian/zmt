import { describe, expect, it } from 'vitest';

import { projectSpriteSlim } from './project-sprite-slim.util';

describe('projectSpriteSlim', () => {
  it('projects the minimal render set: id, texturefile, frames', () => {
    expect(
      projectSpriteSlim({
        frames: 3,
        id: 'GFX_anim',
        texturefile: 'gfx/interface/anim_strip.dds',
      }),
    ).toEqual({
      frames: 3,
      id: 'GFX_anim',
      texturefile: 'gfx/interface/anim_strip.dds',
    });
  });

  it('carries a null frame count through unchanged', () => {
    expect(
      projectSpriteSlim({
        frames: null,
        id: 'GFX_bg',
        texturefile: 'gfx/interface/techtree/bg.dds',
      }).frames,
    ).toBeNull();
  });
});
