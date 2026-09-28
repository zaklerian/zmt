import { descriptorPathForRoot, isDescriptorPath } from './descriptor-path.util';

describe('descriptor paths', () => {
  it('places the descriptor at the root of the mod folder', () => {
    expect(descriptorPathForRoot('/mods/my-mod')).toBe('/mods/my-mod/descriptor.mod');
  });

  it('recognises a .mod file by its last segment, case-insensitively, wherever it sits', () => {
    expect(isDescriptorPath('/mods/my-mod/descriptor.mod')).toBe(true);
    expect(isDescriptorPath('C:\\mods\\BICE_modfile\\Mod Files\\bice.MOD')).toBe(true);
    expect(isDescriptorPath('/mods/my-mod/common/technologies/air.txt')).toBe(false);
    expect(isDescriptorPath('/mods/my-mod/descriptor.mod/')).toBe(true);
    expect(isDescriptorPath('')).toBe(false);
  });
});
