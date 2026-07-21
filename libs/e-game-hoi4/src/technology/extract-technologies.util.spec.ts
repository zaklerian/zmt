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

  it('never projects a definition as a field from a FIXED-allow-list reader, even on a key collision (gate 7)', () => {
    // `@x = 99` is a definition whose name collides with the modeled position key
    // `x`. A fixed-allow-list reader that skipped definitions only "by
    // construction" (symbol names never matching a modeled key) would project the
    // definition's 99 over the real coordinate; the node-kind skip prevents it.
    const source = [
      'technologies = {',
      '\tinfantry = {',
      '\t\tfolder = {',
      '\t\t\tposition = { @x = 99 x = 3 y = 7 }',
      '\t\t}',
      '\t}',
      '}',
      '',
    ].join('\n');
    const [technology] = extractTechnologies(parse(source));
    const position = technology.folders[0].position;
    const x = position.find((field) => field.key === 'x');

    // The real coordinate, not the definition's 99.
    expect(x).toEqual({ key: 'x', value: '3' });
    expect(x?.symbol).toBeUndefined();
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
