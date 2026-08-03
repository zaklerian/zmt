// Canonical HOI4 location of technology-tag declarations, relative to a source
// root. `common/technology_tags/*.txt` declares the technology-category
// vocabulary (`technology_categories`) this index reads (ZMT-35). e-game-hoi4
// owns where these live (ADR 010); the source-scoped entity index enumerates the
// directory per projected source (ADR 024). POSIX-style separators: the value
// composes with both fs joins and parsed relative paths.
export const TECHNOLOGY_CATEGORY_DIR = 'common/technology_tags';
