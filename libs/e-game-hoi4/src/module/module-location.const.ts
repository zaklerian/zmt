// Canonical HOI4 location of equipment-module files, relative to a source root.
// e-game-hoi4 owns where modules live (ADR 010); the cross-source catalog
// enumerates this directory per projected source. POSIX-style separators: the
// value composes with both fs joins and parsed relative paths.
export const MODULE_DIR = 'common/units/equipment/modules';
