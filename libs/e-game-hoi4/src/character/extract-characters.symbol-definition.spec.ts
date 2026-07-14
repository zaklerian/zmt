import { parse } from '@paradox-parser';
import { describe, expect, it } from 'vitest';

import { extractCharacters } from './extract-characters.util';

// ADR 022, decision 7 + regression gate 7: `character` reads an OPEN key space
// (every scalar leaf of a role block and its prop-bags), so it must skip
// `SymbolDefinition` nodes. A root definition and an in-block definition are both
// synthesized here.
const SOURCE = [
  '@root_def = 1',
  'characters = {',
  '\tmy_char = {',
  '\t\tadvisor = {',
  '\t\t\tslot = political_advisor',
  '\t\t\t@in_block = 7',
  '\t\t}',
  '\t}',
  '}',
  '',
].join('\n');

describe('extractCharacters — symbol definitions are not fields (ADR 022 gate 7)', () => {
  it('projects real role scalars but no field for a definition at root or inside a block', () => {
    const [character] = extractCharacters(parse(SOURCE));

    const roleScalarKeys = character.roles[0].scalars.map((field) => field.key);

    expect(roleScalarKeys).toContain('slot');
    expect(roleScalarKeys).not.toContain('in_block');
    expect(roleScalarKeys).not.toContain('root_def');
  });
});
