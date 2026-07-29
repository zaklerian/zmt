// Canonical HOI4 location of technology files, relative to a source root.
// e-game-hoi4 owns where technologies live (ADR 010); the source-scoped entity
// index enumerates this directory per projected source (ADR 024). POSIX-style
// separators: the value composes with both fs joins and parsed relative paths.
export const TECHNOLOGY_DIR = 'common/technologies';
