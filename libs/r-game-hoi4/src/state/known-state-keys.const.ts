import { FieldSpec } from '@r-core';

// Field specs and suggestion sets for the state edit form. Only intrinsic closed
// values carry validation; cross-entity values (`state_category`, resource names,
// building keys, owner / controller tags, province ids) stay free-text — known
// names are freeSolo suggestions only, never a constraint (R-CODE-5). Order is
// the render order (semantic, R-CODE-9 carve-out).

// Root scalar fields. `impassable` is a boolean (rendered as a yes/no select);
// the rest are free-text (`state_category` is cross-entity).
export const STATE_ROOT_SPECS: readonly FieldSpec[] = [
  'id',
  'name',
  'manpower',
  'state_category',
  'local_supplies',
  { name: 'impassable', validation: { type: 'boolean' } },
];

// Resource names commonly carried by a state's `resources` map — freeSolo
// suggestions for the variable-key combobox.
export const KNOWN_RESOURCE_KEYS: readonly string[] = [
  'aluminium',
  'chromium',
  'oil',
  'rubber',
  'steel',
  'tungsten',
];

// Building keys commonly carried by a state's `buildings` map — freeSolo
// suggestions; `naval_base` is the nested map, not a row key.
export const KNOWN_BUILDING_KEYS: readonly string[] = [
  'air_base',
  'anti_air_building',
  'arms_factory',
  'dockyard',
  'industrial_complex',
  'infrastructure',
  'rocket_site',
  'synthetic_refinery',
];

// The two modeled `history` keys (owner / controller country tags) — freeSolo
// suggestions; both are cross-entity, so the key set stays open.
export const KNOWN_HISTORY_KEYS: readonly string[] = ['owner', 'controller'];
