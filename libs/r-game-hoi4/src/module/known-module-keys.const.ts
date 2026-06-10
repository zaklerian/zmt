// Curated suggestion sets for the module edit form's combobox keys. Suggestions
// only — every key control is freeSolo, so modder-defined keys stay editable and
// nothing here narrows the set of keys a module may carry.

// Top-level scalar leaf keys a module commonly carries (category is the
// read-only classifier and is intentionally excluded).
export const KNOWN_MODULE_KEYS: readonly string[] = [
  'gfx',
  'manpower',
  'sfx',
  'xp_research_type',
];

// Stat keys shared by the add_stats / multiply_stats / add_average_stats blocks.
export const KNOWN_MODULE_STAT_KEYS: readonly string[] = [
  'air_agility',
  'air_attack',
  'air_bombing',
  'air_defence',
  'air_ground_attack',
  'air_range',
  'build_cost_ic',
  'fuel_consumption',
  'maximum_speed',
  'naval_strike_attack',
  'naval_strike_targetting',
  'reliability',
  'thrust',
  'weight',
];
