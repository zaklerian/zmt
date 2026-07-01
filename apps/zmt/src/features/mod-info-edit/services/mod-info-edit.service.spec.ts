import { describe, expect, it } from 'vitest';

import { modInfoEditService } from './mod-info-edit.service';

describe('modInfoEditService.isDescriptorPath', () => {
  it('recognizes a .mod file at the repo root', () => {
    expect(modInfoEditService.isDescriptorPath('/mods/a/descriptor.mod')).toBe(
      true,
    );
  });

  it('recognizes a .mod file in a subfolder (BICE layout)', () => {
    expect(
      modInfoEditService.isDescriptorPath(
        '/mods/a/BICE_modfile/Mod Files/BICE.mod',
      ),
    ).toBe(true);
  });

  it('recognizes case-insensitively and across Windows separators', () => {
    expect(modInfoEditService.isDescriptorPath('C:\\mods\\a\\Foo.MOD')).toBe(
      true,
    );
  });

  it('rejects a non-.mod file', () => {
    expect(
      modInfoEditService.isDescriptorPath('/mods/a/common/units/x.txt'),
    ).toBe(false);
  });

  it('rejects a file whose name merely contains "mod"', () => {
    expect(modInfoEditService.isDescriptorPath('/mods/a/module.txt')).toBe(
      false,
    );
  });
});
