import { parse } from '@paradox-parser';
import { describe, expect, it } from 'vitest';

import { extractModules } from './extract-modules.util';

// ADR 022, decision 7 + regression gate 7: `module` reads an OPEN key space
// (every scalar leaf of a module block and of its stat/cost sub-blocks), so it
// must skip `SymbolDefinition` nodes — a definition is a declaration, never a
// field. A root definition and an in-block definition are both synthesized here.
const SOURCE = [
  '@root_def = 1',
  'equipment_modules = {',
  '\tmy_module = {',
  '\t\treliability = 0.5',
  '\t\t@in_block = 7',
  '\t\tadd_stats = {',
  '\t\t\tbuild_cost_ic = 2',
  '\t\t\t@nested_def = 3',
  '\t\t}',
  '\t}',
  '}',
  '',
].join('\n');

describe('extractModules — symbol definitions are not fields (ADR 022 gate 7)', () => {
  it('projects real scalars but no field for a definition at root or inside a block', () => {
    const [module] = extractModules(parse(SOURCE));

    const scalarKeys = module.scalars.map((field) => field.key);
    const statKeys = module.statBlocks.add_stats.map((field) => field.key);

    // Real fields still project.
    expect(scalarKeys).toContain('reliability');
    expect(statKeys).toContain('build_cost_ic');

    // No definition — root, in-block, or nested — surfaces as an editable field.
    for (const declared of ['root_def', 'in_block', 'nested_def']) {
      expect(scalarKeys).not.toContain(declared);
      expect(statKeys).not.toContain(declared);
    }
  });
});
