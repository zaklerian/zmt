import type { EntityField } from '@contracts';

// The editable surface of a HOI4 character. `token` is the entity identifier (the
// `token = { ... }` key under `characters`) and the dialog title; `name` and
// `gender` are the root scalar fields (empty string when the source omits them).
// Unmodeled root sub-blocks (e.g. `allowed_civil_war`) are carried verbatim
// through a save and never surface here.
export interface CharacterEntity {
  readonly gender: string;
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

// A present role block: its known-key scalars plus its bare-token `traits` list.
// Ecosystem sub-blocks (advisor `on_add`/`visible`/`available`/`modifier`) are
// not projected here — they stay verbatim in the lossless node (R-CODE-5).
export interface CharacterRole {
  readonly id: CharacterRoleId;
  readonly scalars: readonly EntityField[];
  readonly traits: readonly string[];
}

// The character roles this layer projects. Each is an optional named block,
// rendered only when present in the file (present-only; no role insertion —
// entity create/insert is the deferred contract). Several may coexist.
export type CharacterRoleId =
  | 'advisor'
  | 'corps_commander'
  | 'country_leader'
  | 'field_marshal'
  | 'navy_leader';

export type PortraitGroup = 'army' | 'civilian' | 'navy';
