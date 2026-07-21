import { parse } from '@paradox-parser';
import { describe, expect, it } from 'vitest';

import { extractStates } from './extract-states.util';

// ADR 022, decision 7 + regression gate 7: `state` reads an OPEN key space (every
// scalar leaf of `buildings` / `resources`), so it must skip `SymbolDefinition`
// nodes. A root definition and an in-block definition are both synthesized here.
const SOURCE = [
  '@root_def = 1',
  'state = {',
  '\tid = 1',
  '\tname = "STATE_1"',
  '\tbuildings = {',
  '\t\tarms_factory = 2',
  '\t\t@in_block = 7',
  '\t}',
  '}',
  '',
].join('\n');

describe('extractStates — symbol definitions are not fields (ADR 022 gate 7)', () => {
  it('projects real building rows but no field for a definition at root or inside a block', () => {
    const [state] = extractStates(parse(SOURCE));

    const buildingKeys = state.buildings.map((field) => field.key);

    expect(buildingKeys).toContain('arms_factory');
    expect(buildingKeys).not.toContain('in_block');
    expect(buildingKeys).not.toContain('root_def');
  });
});
