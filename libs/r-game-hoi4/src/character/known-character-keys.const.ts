import { CharacterRoleId } from '@contracts';
import { FieldSpec } from '@r-core';

// Curated suggestion sets for the character edit form's combobox keys. Only
// file-local intrinsic values carry a closed spec; cross-entity values
// (`ideology`, `slot`, `idea_token`, trait names) stay free-text (R-CODE-5).

// The closed gender set. Display order is intentional (male, female), so it is
// kept rather than alphabetized (R-CODE-9 array-literal carve-out).
export const GENDER_VALUES: readonly string[] = ['male', 'female'];

// `portraits` group leaves — gfx paths, free-text.
export const KNOWN_PORTRAIT_KEYS: readonly FieldSpec[] = ['large', 'small'];

// Land commander skills (corps_commander / field_marshal).
export const KNOWN_LAND_COMMANDER_KEYS: readonly FieldSpec[] = [
  'attack_skill',
  'defense_skill',
  'logistics_skill',
  'planning_skill',
  'skill',
];

// Naval commander skills (navy_leader).
export const KNOWN_NAVY_LEADER_KEYS: readonly FieldSpec[] = [
  'attack_skill',
  'coordination_skill',
  'maneuvering_skill',
  'skill',
];

// Advisor known keys. `can_be_fired` is the one intrinsic closed value (boolean,
// rendered as a yes/no select); `slot` / `idea_token` are cross-entity free-text.
export const KNOWN_ADVISOR_KEYS: readonly FieldSpec[] = [
  { name: 'can_be_fired', validation: { type: 'boolean' } },
  'cost',
  'idea_token',
  'slot',
];

// Country-leader known keys — all free-text (`ideology` is cross-entity).
export const KNOWN_COUNTRY_LEADER_KEYS: readonly FieldSpec[] = [
  'desc',
  'expire',
  'id',
  'ideology',
];

export const KNOWN_ROLE_KEYS: Readonly<
  Record<CharacterRoleId, readonly FieldSpec[]>
> = {
  advisor: KNOWN_ADVISOR_KEYS,
  corps_commander: KNOWN_LAND_COMMANDER_KEYS,
  country_leader: KNOWN_COUNTRY_LEADER_KEYS,
  field_marshal: KNOWN_LAND_COMMANDER_KEYS,
  navy_leader: KNOWN_NAVY_LEADER_KEYS,
};
