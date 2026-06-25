import type { EntityField } from '../entity';

// The editable surface of a HOI4 state. The entity block is the file's
// `state = { … }` block; `id` and `name` are the root identity scalars (`id`
// titles the row and the edit dialog). `rootScalars` are the modeled root scalar
// fields present in the source (raw values; empty when omitted). `resources` and
// `buildings` are variable-key maps (resource names, state-wide building keys —
// cross-entity, so the key sets are open); `provinceBuildings` is the per-province
// building map — each `<province-id> = { building = level … }` object child of
// `buildings`, keyed by province id (ZMT-E16). `provinces` is a bare-token id list;
// `history` is modeled THIN (owner / controller only). Lossless ecosystem content —
// `victory_points` positional pairs, the dated `<date> { … }` event blocks, the
// history building overrides, and every other unmodeled block — is never projected
// here and carries through a save verbatim (R-CODE-5).
export interface StateEntity {
  readonly buildings: readonly EntityField[];
  readonly history: readonly EntityField[];
  readonly id: string;
  readonly name: string;
  readonly provinceBuildings: readonly StateProvinceBuildings[];
  readonly provinces: readonly string[];
  readonly resources: readonly EntityField[];
  readonly rootScalars: readonly EntityField[];
}

// One per-province building entry of a state's `buildings` map: a province named by
// its variable `id` key, carrying its flat `building = level` scalars (`rows`) — an
// editable prop-bag (ZMT-E16, reusing the ZMT-E15 keyed-map prop-bag entry). Its own
// block-valued children (a third nesting level) stay verbatim in the lossless node —
// the two-level cap leaves them carried, not modeled (R-CODE-5).
export interface StateProvinceBuildings {
  readonly id: string;
  readonly rows: readonly EntityField[];
}
