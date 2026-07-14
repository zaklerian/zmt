import { parse } from '@paradox-parser';
import { describe, expect, it } from 'vitest';

import { extractTechnologies } from './extract-technologies.util';

// The ADR 022 regression gate, item 4: a technology whose position coordinates
// are written as `@`-substitution constants extracts to the RESOLVED literals,
// each carrying its symbolic origin — never the sigil-stripped incidental name.
const SOURCE = [
  '@FTR_START = -5',
  '@1933 = 100',
  'technologies = {',
  '\tinfantry = {',
  '\t\tfolder = {',
  '\t\t\tposition = { x = @FTR_START y = @1933 }',
  '\t\t}',
  '\t}',
  '}',
  '',
].join('\n');

describe('extractTechnologies — @ substitution constants (ADR 022 gate 4)', () => {
  it('resolves symbolic position coordinates and records the symbol name', () => {
    const script = parse(SOURCE);
    expect(script.errors).toEqual([]);

    const [technology] = extractTechnologies(script);
    expect(technology.token).toBe('infantry');

    const position = technology.folders[0].position;
    const x = position.find((field) => field.key === 'x');
    const y = position.find((field) => field.key === 'y');

    expect(x).toEqual({
      key: 'x',
      symbol: { name: 'FTR_START' },
      value: '-5',
    });
    expect(y).toEqual({
      key: 'y',
      symbol: { name: '1933' },
      value: '100',
    });
  });

  it('leaves a plain literal coordinate free of any symbol', () => {
    const source = [
      'technologies = {',
      '\tinfantry = {',
      '\t\tfolder = {',
      '\t\t\tposition = { x = 3 y = 7 }',
      '\t\t}',
      '\t}',
      '}',
      '',
    ].join('\n');
    const [technology] = extractTechnologies(parse(source));
    const x = technology.folders[0].position.find((field) => field.key === 'x');

    expect(x).toEqual({ key: 'x', value: '3' });
    expect(x?.symbol).toBeUndefined();
  });
});
