import { FieldSpec } from '@r-core';

// Field specs for the ideology edit form. Intrinsic closed values (the booleans)
// carry `type: boolean` validation so they render a yes/no select; the
// world-tension scalars are free-text numbers. Order is the render order
// (semantic, R-CODE-9 carve-out).

// A `type: boolean` spec — renders a yes/no select and round-trips the `yes`/`no`
// token rather than a JS boolean (ZMT-E14).
function bool(name: string): FieldSpec {
  return { name, validation: { type: 'boolean' } };
}

// Modeled root scalar fields, in render order: the two world-tension impacts, then
// the intrinsic ideology booleans, then the single `ai_*` behaviour flag set to
// `yes` (modeled as its four known boolean keys so the file round-trips exactly —
// a faithful model, not the nicer single-enum UX, ZMT-E19). Only keys present in a
// file project; an absent boolean key stays absent on save (empty value, dropped).
// Every other root key, and every block other than `rules` / `modifiers` /
// `faction_modifiers`, is carried lossless (R-CODE-5).
export const IDEOLOGY_ROOT_SPECS: readonly FieldSpec[] = [
  'war_impact_on_world_tension',
  'faction_impact_on_world_tension',
  bool('can_host_government_in_exile'),
  bool('can_be_boosted'),
  bool('can_collaborate'),
  bool('ai_democratic'),
  bool('ai_communist'),
  bool('ai_fascist'),
  bool('ai_neutral'),
];

// Curated boolean suggestion set for the `rules` open bag's combobox keys. Each
// renders a yes/no value select when its key matches. Suggestions only — the bag
// is freeSolo, so a modder-defined rule key stays editable and round-trips, and
// nothing here narrows the set of rules an ideology may carry (ZMT-E19).
export const KNOWN_IDEOLOGY_RULES_KEYS: readonly FieldSpec[] = [
  bool('can_create_collaboration_government'),
  bool('can_declare_war_on_same_ideology'),
  bool('can_force_government'),
  bool('can_guarantee_other_ideologies'),
  bool('can_lower_tension'),
  bool('can_only_justify_war_on_threat_country'),
  bool('can_puppet'),
  bool('can_send_volunteers'),
];
