import type { EquipmentDomain } from '@contracts';

// Closed type→domain table for HOI4 equipment. Entity semantics live here in
// e-game-hoi4, not in @paradox-parser. O(1) token→domain lookup via the const
// object; an unknown token resolves to `undefined` and drives 'unknown-type'.
export const EQUIPMENT_TYPE_DOMAIN = {
  air_transport: 'air',
  anti_air: 'land',
  anti_tank: 'land',
  armor: 'land',
  artillery: 'land',
  capital_ship: 'naval',
  carrier: 'naval',
  cas: 'air',
  convoy: 'naval',
  fighter: 'air',
  heavy_tank_chassis: 'land',
  infantry: 'land',
  interceptor: 'air',
  light_tank_chassis: 'land',
  mechanized: 'land',
  medium_tank_chassis: 'land',
  missile: 'air',
  motorized: 'land',
  naval_bomber: 'air',
  naval_transport: 'naval',
  rocket: 'land',
  screen_ship: 'naval',
  strat_bomber: 'air',
  submarine: 'naval',
  suicide: 'air',
  support_equipment: 'land',
  tactical_bomber: 'air',
} as const satisfies Record<string, EquipmentDomain>;
