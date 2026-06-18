import type { EntityField } from '../entity';

// The editable surface of a HOI4 ideology. `token` is the entity identifier (the
// `<ideology> = { … }` key under the top-level `ideologies` wrapper) and the
// dialog title; `rootScalars` are the modeled file-local root scalars (the two
// world-tension fields). `dynamicFactionNames` is the `dynamic_faction_names`
// list-of-scalars; `types` is the editable variable-key map of subideologies.
// Unmodeled root blocks (`color`, `rules`, `modifiers`, `faction_modifiers`,
// `ai_*`) are carried verbatim through a save and never surface here (R-CODE-5).
export interface IdeologyEntity {
  readonly dynamicFactionNames: readonly string[];
  readonly rootScalars: readonly EntityField[];
  readonly token: string;
  readonly types: readonly IdeologyType[];
}

// One `types` entry: a subideology named by its variable `key`, carrying only the
// modeled scalar `can_be_randomly_selected`. Its own unmodeled scalars and blocks
// (e.g. a subideology `color`, a third nesting level) stay verbatim in the
// lossless node — the two-level cap leaves them carried, not modeled (R-CODE-5).
export interface IdeologyType {
  readonly key: string;
  readonly scalars: readonly EntityField[];
}
