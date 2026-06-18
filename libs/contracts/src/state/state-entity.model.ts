import type { EntityField } from '../entity';

// The editable surface of a HOI4 state. The entity block is the file's
// `state = { … }` block; `id` and `name` are the root identity scalars (`id`
// titles the row and the edit dialog). `rootScalars` are the modeled root scalar
// fields present in the source (raw values; empty when omitted). `resources`,
// `buildings`, and `navalBase` are variable-key maps (resource names, building
// keys, province ids — cross-entity, so the key sets are open); `provinces` is a
// bare-token id list; `history` is modeled THIN (owner / controller only).
// Lossless ecosystem content — `victory_points` positional pairs, the dated
// `<date> { … }` event blocks, the history building overrides, and every other
// unmodeled block — is never projected here and carries through a save verbatim
// (R-CODE-5).
export interface StateEntity {
  readonly buildings: readonly EntityField[];
  readonly history: readonly EntityField[];
  readonly id: string;
  readonly name: string;
  readonly navalBase: readonly EntityField[];
  readonly provinces: readonly string[];
  readonly resources: readonly EntityField[];
  readonly rootScalars: readonly EntityField[];
}
