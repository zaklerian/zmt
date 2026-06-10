import type { AssignmentNode } from '@paradox-parser';

import type { EntityField } from '../entity';

export type ModuleDomain = 'air' | 'land' | 'naval' | 'unclassified';

export interface ModuleEntity {
  // The module's `category` value, surfaced read-only for display and used as the
  // classification input. Empty string when the source omits it.
  readonly category: string;
  readonly domain: ModuleDomain;
  readonly name: string;
  // Lossless: the original parsed `name = { ... }` node, retained so a save can
  // round-trip blocks the tool does not project (gui, can_convert_from,
  // dependencies, critical_parts). Kept as the parser's own mutable shape; only
  // the handle is readonly.
  readonly node: AssignmentNode;
  // Flat projection of the module's own top-level scalar leaf fields, excluding
  // the name and the `category` classifier key. Nested blocks stay in `node`.
  readonly scalars: readonly EntityField[];
  // The known stat blocks projected to flat field lists. A block absent from the
  // source yields an empty list, never a fabricated default.
  readonly statBlocks: ModuleStatBlocks;
}

export type ModuleStatBlock =
  | 'add_average_stats'
  | 'add_stats'
  | 'multiply_stats';

export type ModuleStatBlocks = Readonly<
  Record<ModuleStatBlock, readonly EntityField[]>
>;
