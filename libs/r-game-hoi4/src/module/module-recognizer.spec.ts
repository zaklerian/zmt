import { describe, expect, it } from 'vitest';

import { MODULE_RECOGNIZER } from './module-recognizer';

describe('MODULE_RECOGNIZER.matches', () => {
  it('matches an equipment-modules file on posix and windows separators', () => {
    expect(
      MODULE_RECOGNIZER.matches(
        '/mods/foo/common/units/equipment/modules/00_air_modules.txt',
      ),
    ).toBe(true);
    expect(
      MODULE_RECOGNIZER.matches(
        'C:\\mods\\foo\\common\\units\\equipment\\modules\\00_air_modules.txt',
      ),
    ).toBe(true);
  });

  it('does not match the parent equipment file', () => {
    expect(
      MODULE_RECOGNIZER.matches(
        '/mods/foo/common/units/equipment/infantry.txt',
      ),
    ).toBe(false);
  });

  it('does not match non-txt files or files outside the modules dir', () => {
    expect(
      MODULE_RECOGNIZER.matches(
        '/mods/foo/common/units/equipment/modules/readme.md',
      ),
    ).toBe(false);
    expect(MODULE_RECOGNIZER.matches('/mods/foo/common/units/names.txt')).toBe(
      false,
    );
  });

  it('does not match a file nested below the modules dir', () => {
    expect(
      MODULE_RECOGNIZER.matches(
        '/mods/foo/common/units/equipment/modules/sub/air.txt',
      ),
    ).toBe(false);
  });
});
