import { describe, expect, it } from 'vitest';

import { parseSource } from './parse-file.util';
import { checkSerializeIdentity } from './round-trip.util';

describe('checkSerializeIdentity', () => {
  it('returns null when parse → serialize is byte-identical', () => {
    const source = `technologies = {\n\tinf = {\n\t\tresearch_cost = 2.0\n\t}\n}\n`;
    const script = parseSource(source);
    expect(script.errors).toEqual([]);
    expect(checkSerializeIdentity('inf.txt', script, source)).toBeNull();
  });

  it('preserves comments and irregular whitespace verbatim', () => {
    const source = `# a comment\ntechnologies = {\n\t\tinf   =   {   }\n}\n`;
    const script = parseSource(source);
    expect(checkSerializeIdentity('inf.txt', script, source)).toBeNull();
  });
});
