import type { EntityBlockScopeSegment, EntityField } from '../entity';

// The editable surface of a HOI4 character. `token` is the entity identifier (the
// `token = { ... }` key under `characters`) and the dialog title; `name` is the
// root scalar field (empty string when the source omits it). Unmodeled root
// sub-blocks (e.g. `allowed_civil_war`) are carried verbatim through a save and
// never surface here.
export interface CharacterEntity {
  readonly name: string;
  readonly portraits: readonly CharacterPortraitGroup[];
  readonly roles: readonly CharacterRole[];
  readonly token: string;
}

// One `portraits` group (`army` / `civilian` / `navy`) and its scalar gfx-path
// leaves (`large` / `small`) — the bounded second nesting level.
export interface CharacterPortraitGroup {
  readonly group: PortraitGroup;
  readonly rows: readonly EntityField[];
}

// A present role block: its known-key scalars, its bare-token `traits` list, and
// any open key→value sub-bags projected for the role (advisor `modifier` /
// `research_bonus`, scientist `skills`). Other ecosystem sub-blocks (advisor
// `on_add`/`visible`/`available`) stay verbatim in the lossless node (R-CODE-5).
// `scope` is the write-scope prefix of the role block: empty for a top-level role,
// or a single indexed `instance` segment when the role lives in the Nth `instance`
// DLC wrapper. The wrapper and its DLC condition are not modeled — only the role
// surfaces; a save targets the role inside its instance and leaves the wrapper and
// condition byte-identical (ADR 019 indexed segment, R-CODE-5).
export interface CharacterRole {
  readonly bags: readonly CharacterRoleBag[];
  readonly id: CharacterRoleId;
  readonly scalars: readonly EntityField[];
  readonly scope: readonly EntityBlockScopeSegment[];
  readonly traits: readonly string[];
}

// A named open key→value sub-block of a role, projected as a prop-bag: advisor
// `modifier` (modifier-name → number) / `research_bonus` (category → float), and
// scientist `skills` (specialization → int). `rows` keep raw value tokens so an
// untouched bag round-trips byte-identical.
export interface CharacterRoleBag {
  readonly name: string;
  readonly rows: readonly EntityField[];
}

// The character roles this layer projects. Each is an optional named block,
// rendered only when present in the file (present-only; no role insertion —
// entity create/insert is the deferred contract). Several may coexist.
export type CharacterRoleId =
  | 'advisor'
  | 'corps_commander'
  | 'country_leader'
  | 'field_marshal'
  | 'navy_leader'
  | 'scientist';

export type PortraitGroup = 'army' | 'civilian' | 'navy';
