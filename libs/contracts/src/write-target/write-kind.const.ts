// The closed set of write-kinds (ADR 029 decision 1): the unit a save-target is
// resolved and persisted per. A kind is a KIND OF NEW CONTENT, not a write path —
// a `set` on a file that already owns the content is provenance-routed and never
// reaches this vocabulary (decision 2).
//
// `sprite` is RESERVED: it is named so the model is complete rather than grown one
// kind at a time, and it has no consult point until a sprite-creation flow exists.
export const WRITE_KINDS = {
  locKey: 'locKey',
  sprite: 'sprite',
  technology: 'technology',
} as const satisfies Record<string, string>;

export type WriteKind = (typeof WRITE_KINDS)[keyof typeof WRITE_KINDS];

// Where a kind's files live inside a mod, and the extension the settings surface
// offers. Mod-relative, POSIX-separated — the same shape every write address in
// the app carries.
//
// ADR 029 decision 1 derives a SCRIPT kind's folder from `ENTITY_REGISTRY[kind]`,
// which is main-side (`@e-game-hoi4`) and unreachable from the renderer that has to
// draw the picker. The values are therefore restated here, at the one boundary both
// processes share (R-ELECTRON-2), and pinned to the registry's by
// `write-kind-location.drift.spec.ts` — the drift the ADR's "does not restate it"
// was protecting against is caught by the compiler-adjacent gate instead of by the
// import.
export const WRITE_KIND_LOCATIONS = {
  locKey: { extension: '.yml', folder: 'localisation' },
  sprite: { extension: '.gfx', folder: 'interface' },
  technology: { extension: '.txt', folder: 'common/technologies' },
} as const satisfies Record<WriteKind, WriteKindLocation>;

export interface WriteKindLocation {
  readonly extension: string;
  readonly folder: string;
}
