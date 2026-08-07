// Canonical HOI4 location of `.gfx` sprite declarations, relative to a source
// root. `interface/*.gfx` declares the named sprites (`SpriteType` and its
// `*SpriteType` variants) the source-scoped index reads (ZMT-39). e-game-hoi4
// owns where these live (ADR 010); the index enumerates the directory per
// projected source (ADR 024). POSIX-style separators: the value composes with
// both fs joins and parsed relative paths.
export const SPRITE_DIR = 'interface';

// Sprites ship as `.gfx`, not the `.txt` every other indexed entity type uses.
// The registry carries this per-type so the generic enumeration reads the right
// files (the enumerator defaults to `.txt` for the types that omit it). The
// `.gfx` grammar IS the paradox script grammar (ZMT-37: `.gfx` parses with 0
// errors), so extraction is unchanged — only the enumeration filter differs.
export const SPRITE_FILE_EXTENSION = '.gfx';
