import type { Script } from '@paradox-parser';

import { HOI4_PLUGIN } from '@e-game-hoi4';
import { dialectsFromPlugins, parse } from '@paradox-parser';

// The dialects the parser needs for HOI4 script (`hoi4_bracket_expr`), read from
// the plugin rather than hardcoded — the same source the app's read/write paths
// use (`dialectsFromPlugins(pluginRegistryService.list())`). hoi4 is the only game
// today (ADR 010); when a second plugin lands, add it here.
const DIALECTS = dialectsFromPlugins([HOI4_PLUGIN]);

export function parseSource(source: string): Script {
  return parse(source, { dialects: DIALECTS });
}
