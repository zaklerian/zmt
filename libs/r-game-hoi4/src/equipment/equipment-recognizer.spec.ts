import { describe, expect, it } from 'vitest';

import { EQUIPMENT_RECOGNIZER } from './equipment-recognizer';

describe('EQUIPMENT_RECOGNIZER.matches', () => {
  it('matches an equipment-units file on posix and windows separators', () => {
    expect(
      EQUIPMENT_RECOGNIZER.matches(
        '/mods/foo/common/units/equipment/infantry.txt',
      ),
    ).toBe(true);
    expect(
      EQUIPMENT_RECOGNIZER.matches(
        'C:\\mods\\foo\\common\\units\\equipment\\infantry.txt',
      ),
    ).toBe(true);
  });

  it('does not match a similarly named sibling directory', () => {
    expect(
      EQUIPMENT_RECOGNIZER.matches(
        '/mods/foo/common/units/equipment_modules/air.txt',
      ),
    ).toBe(false);
  });

  it('does not match non-txt files or files outside the equipment dir', () => {
    expect(
      EQUIPMENT_RECOGNIZER.matches(
        '/mods/foo/common/units/equipment/readme.md',
      ),
    ).toBe(false);
    expect(
      EQUIPMENT_RECOGNIZER.matches('/mods/foo/common/units/names.txt'),
    ).toBe(false);
  });

  it('does not match a file nested below the equipment dir', () => {
    expect(
      EQUIPMENT_RECOGNIZER.matches(
        '/mods/foo/common/units/equipment/sub/infantry.txt',
      ),
    ).toBe(false);
  });
});
