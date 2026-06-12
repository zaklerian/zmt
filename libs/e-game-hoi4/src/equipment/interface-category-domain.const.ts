import type { EquipmentDomain } from '@contracts';

// Closed interface_category→domain table for HOI4 equipment (ADR 017). An
// archetype's domain is read from its authored `interface_category`, not its
// `type`. Literal enumeration only: a value absent here yields no domain and the
// archetype classifies as no-domain/invalid. Domain is never inferred from a
// value's substring or suffix (e.g. no `*_ships → naval`); a genuinely new
// category classifies only once added here deliberately.
export const INTERFACE_CATEGORY_DOMAIN = {
  interface_category_air: 'air',
  interface_category_armor: 'land',
  interface_category_capital_ships: 'naval',
  interface_category_land: 'land',
  interface_category_other_ships: 'naval',
  interface_category_screen_ships: 'naval',
} satisfies Record<string, EquipmentDomain>;
