import { describe, expect, it } from 'vitest';

import { IDEOLOGY_RECOGNIZER } from './ideology-recognizer';

describe('IDEOLOGY_RECOGNIZER.matches', () => {
  it('matches a common/ideologies file on posix and windows separators', () => {
    expect(
      IDEOLOGY_RECOGNIZER.matches(
        '/mods/foo/common/ideologies/00_ideologies.txt',
      ),
    ).toBe(true);
    expect(
      IDEOLOGY_RECOGNIZER.matches(
        'C:\\mods\\foo\\common\\ideologies\\00_ideologies.txt',
      ),
    ).toBe(true);
  });

  it('does not match non-txt files or files outside the ideologies dir', () => {
    expect(
      IDEOLOGY_RECOGNIZER.matches('/mods/foo/common/ideologies/readme.md'),
    ).toBe(false);
    expect(IDEOLOGY_RECOGNIZER.matches('/mods/foo/common/names.txt')).toBe(
      false,
    );
  });

  it('does not match a file nested below the ideologies dir', () => {
    expect(
      IDEOLOGY_RECOGNIZER.matches(
        '/mods/foo/common/ideologies/sub/00_ideologies.txt',
      ),
    ).toBe(false);
  });
});
