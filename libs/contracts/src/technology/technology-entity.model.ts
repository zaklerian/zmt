import type { EntityField } from '../entity';

// The editable surface of a HOI4 technology. `token` is the entity identifier
// (the `token = { ... }` key under `technologies`) and the dialog title;
// `rootScalars` are the modeled root scalar fields present in the source (raw
// values; empty when omitted). `paths` and `folders` are the repeated same-named
// object-list blocks; the ref-lists are bare-token value lists. Ecosystem blocks
// (`allow`, `allow_branch`, `on_research_complete`, the bonus block, `ai_will_do`,
// `ai_research_weights`) and any unmodeled sub-block are never projected here —
// they stay verbatim in the lossless node and carry through a save (R-CODE-5).
//
// The tech-graph model carries two DISTINCT edge kinds and one attached node kind
// (decided in ZMT-E28 planning; the tech-tree canvas draws off this shape):
//   - `paths` — the DRAWN prerequisite (OR semantics; the in-game arrow), a rich
//     edge carrying `leads_to_tech` / `research_cost_coeff` / `ignore_for_layout`.
//   - `dependencies` — the AND prerequisite: a real edge that draws no line, read
//     as target tech tokens flattened across every repeated `dependencies` block
//     and across both source forms (a bare token and the `{ <tech> = 1 }` form).
//   - `subTechnologies` — a third node kind. A sub-technology carries no
//     `folder`/`position`; the engine attaches it to the parent that lists it, so
//     it is modeled here on the parent as the list of attached child-node tokens.
export interface TechnologyEntity {
  readonly categories: readonly string[];
  readonly dependencies: readonly string[];
  readonly enableEquipmentModules: readonly string[];
  readonly enableEquipments: readonly string[];
  readonly enableSubunits: readonly string[];
  readonly folders: readonly TechnologyFolder[];
  readonly paths: readonly TechnologyPath[];
  readonly rootScalars: readonly EntityField[];
  readonly subTechnologies: readonly string[];
  readonly token: string;
  readonly xor: readonly string[];
}

// One `folder` block: its scalar leaves (`name`) plus the nested `position`
// object's scalar leaves (`x`, `y`) — the one bounded second nesting level.
export interface TechnologyFolder {
  readonly position: readonly EntityField[];
  readonly scalars: readonly EntityField[];
}

// One `path` block: its scalar leaves (`leads_to_tech`, `research_cost_coeff`).
export interface TechnologyPath {
  readonly scalars: readonly EntityField[];
}
