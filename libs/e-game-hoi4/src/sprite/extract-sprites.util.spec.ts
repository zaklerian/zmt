import { parse } from '@paradox-parser';
import { describe, expect, it } from 'vitest';

import { extractSprites } from './extract-sprites.util';

describe('extractSprites', () => {
  // Gate 3 (the ZMT-E27 repeated-block read class): a `.gfx` declares many blocks
  // all literally named `SpriteType`, distinguished only by an inner `name`. A
  // first-match reader would drop all but one; this asserts every block is emitted.
  it('emits one entity per SpriteType block, keyed by inner name (none dropped)', () => {
    const blocks = Array.from({ length: 12 }, (_, index) =>
      [
        '\tSpriteType = {',
        `\t\tname = "GFX_tech_${index}"`,
        `\t\ttexturefile = "gfx/interface/technologies/tech_${index}.dds"`,
        '\t}',
      ].join('\n'),
    );
    const script = parse(`spriteTypes = {\n${blocks.join('\n')}\n}\n`);

    const sprites = extractSprites(script);

    expect(sprites).toHaveLength(12);
    expect(sprites.map((sprite) => sprite.id)).toEqual(
      Array.from({ length: 12 }, (_, index) => `GFX_tech_${index}`),
    );
    expect(sprites[3]).toEqual({
      frames: null,
      id: 'GFX_tech_3',
      texturefile: 'gfx/interface/technologies/tech_3.dds',
    });
  });

  // BICE carries `frameAnimatedSpriteType`, `corneredTileSpriteType`, and
  // `textSpriteType` alongside bare `SpriteType`; all register by `name`, so all
  // are read. `noOfFrames` becomes `frames`; its absence is a single-frame null.
  it('reads every *SpriteType variant and captures noOfFrames as frames', () => {
    const script = parse(
      [
        'spriteTypes = {',
        '\tSpriteType = {',
        '\t\tname = "GFX_bg"',
        '\t\ttexturefile = "gfx/interface/techtree/bg.dds"',
        '\t}',
        '\tframeAnimatedSpriteType = {',
        '\t\tname = "GFX_anim"',
        '\t\ttexturefile = "gfx/interface/anim_strip.dds"',
        '\t\tnoOfFrames = 3',
        '\t}',
        '\tcorneredTileSpriteType = {',
        '\t\tname = "GFX_tile"',
        '\t\ttextureFile = "gfx/interface/tiles/tile.dds"',
        '\t}',
        '\ttextSpriteType = {',
        '\t\tname = "GFX_text"',
        '\t\ttexturefile = "gfx/interface/text.dds"',
        '\t}',
        '}',
      ].join('\n'),
    );

    const byId = new Map(
      extractSprites(script).map((sprite) => [sprite.id, sprite]),
    );

    expect([...byId.keys()].sort()).toEqual([
      'GFX_anim',
      'GFX_bg',
      'GFX_text',
      'GFX_tile',
    ]);
    expect(byId.get('GFX_anim')?.frames).toBe(3);
    expect(byId.get('GFX_bg')?.frames).toBeNull();
    // `textureFile` (capital F) is read the same as `texturefile` — Paradox keys
    // are case-insensitive and BICE mixes both spellings.
    expect(byId.get('GFX_tile')?.texturefile).toBe(
      'gfx/interface/tiles/tile.dds',
    );
  });

  // The raw `texturefile` is emitted verbatim — double-slashes and mixed case
  // included. Normalization and resolution are resolution B's job, not the read's.
  it('emits texturefile raw, without normalizing slashes or case', () => {
    const script = parse(
      [
        'spriteTypes = {',
        '\tSpriteType = {',
        '\t\tname = "GFX_air_techtree_bg"',
        '\t\ttextureFile = "gfx//interface//techtree//air_techtree_bg.dds"',
        '\t}',
        '}',
      ].join('\n'),
    );

    expect(extractSprites(script)[0]?.texturefile).toBe(
      'gfx//interface//techtree//air_techtree_bg.dds',
    );
  });

  // Same-name duplicates within one file are ALL emitted; last-wins name
  // resolution is the index's stage-2 concern (across files), not the extractor's.
  it('emits all blocks sharing a name — dedup is the index stage-2 concern', () => {
    const script = parse(
      [
        'spriteTypes = {',
        '\tSpriteType = { name = "GFX_dup" texturefile = "a.dds" }',
        '\tSpriteType = { name = "GFX_dup" texturefile = "b.dds" }',
        '}',
      ].join('\n'),
    );

    const dups = extractSprites(script).filter(
      (sprite) => sprite.id === 'GFX_dup',
    );
    expect(dups.map((sprite) => sprite.texturefile)).toEqual([
      'a.dds',
      'b.dds',
    ]);
  });

  // Sprites declared at the file's top level (no `spriteTypes` wrapper) are read;
  // `bitmapfonts` / `objectTypes` blocks declare no `*SpriteType` and are ignored.
  it('reads top-level sprites and ignores non-sprite blocks', () => {
    const script = parse(
      [
        'SpriteType = {',
        '\tname = "GFX_top_level"',
        '\ttexturefile = "gfx/interface/x.dds"',
        '}',
        'bitmapfonts = {',
        '\tbitmapfont = { name = "vic_18" }',
        '}',
      ].join('\n'),
    );

    expect(extractSprites(script).map((sprite) => sprite.id)).toEqual([
      'GFX_top_level',
    ]);
  });

  // A `*SpriteType` with no `name` cannot be resolved and is skipped; a sprite
  // with no `texturefile` still declares a name, so it is emitted with an empty
  // texture (asset resolution of an empty path is a clean unresolved).
  it('skips nameless blocks and emits an empty texturefile when absent', () => {
    const script = parse(
      [
        'spriteTypes = {',
        '\tSpriteType = { texturefile = "orphan.dds" }',
        '\tSpriteType = { name = "GFX_no_texture" }',
        '}',
      ].join('\n'),
    );

    expect(extractSprites(script)).toEqual([
      { frames: null, id: 'GFX_no_texture', texturefile: '' },
    ]);
  });
});
