import { parse } from '@paradox-parser';
import { describe, expect, it } from 'vitest';

import { extractIdeologies } from './extract-ideologies.util';

// ADR 022, decision 7 + regression gate 7: `ideology` reads an OPEN key space
// (every scalar leaf of the `modifiers` / `faction_modifiers` / `rules` bags and
// of each subideology), so it must skip `SymbolDefinition` nodes. A root
// definition and an in-block definition are both synthesized here.
const SOURCE = [
  '@root_def = 1',
  'ideologies = {',
  '\tfascism = {',
  '\t\tmodifiers = {',
  '\t\t\twar_support_factor = 0.1',
  '\t\t\t@in_block = 7',
  '\t\t}',
  '\t}',
  '}',
  '',
].join('\n');

describe('extractIdeologies — symbol definitions are not fields (ADR 022 gate 7)', () => {
  it('projects real modifier rows but no field for a definition at root or inside a block', () => {
    const [ideology] = extractIdeologies(parse(SOURCE));

    const modifierKeys = ideology.modifiers.map((field) => field.key);

    expect(modifierKeys).toContain('war_support_factor');
    expect(modifierKeys).not.toContain('in_block');
    expect(modifierKeys).not.toContain('root_def');
  });
});
