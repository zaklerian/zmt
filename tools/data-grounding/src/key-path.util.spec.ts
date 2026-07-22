import { describe, expect, it } from 'vitest';

import { lineOf, makeLineLookup } from './key-path.util';

describe('makeLineLookup', () => {
  it('matches lineOf semantics: a newline advances the line only past its offset', () => {
    const source = 'a\nb\nc';
    const lineAt = makeLineLookup(source);
    // indices: a=0 \n=1 b=2 \n=3 c=4
    expect(lineAt(0)).toBe(1);
    expect(lineAt(1)).toBe(1); // the newline AT offset 1 is not yet crossed
    expect(lineAt(2)).toBe(2);
    expect(lineAt(3)).toBe(2);
    expect(lineAt(4)).toBe(3);
  });

  it('caps past end of source like lineOf', () => {
    const source = 'x\ny\n';
    const lineAt = makeLineLookup(source);
    expect(lineAt(1000)).toBe(lineOf(source, 1000));
  });

  it('is equivalent to lineOf at every offset, incl. blank lines and CRLF', () => {
    const source = '\n\nkey = {\r\n\tinner = 1\n}\n\n\ntail';
    const lineAt = makeLineLookup(source);
    for (let offset = 0; offset <= source.length + 3; offset += 1) {
      expect(lineAt(offset)).toBe(lineOf(source, offset));
    }
  });
});
