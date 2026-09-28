import { FILE_SUPPORT } from '@zmt/contracts';

import { classifyFile, extensionOf } from './classify-file.util';
import { DEFAULT_FILE_CLASSIFICATION } from './default-file-classification.const';

describe('classifyFile', () => {
  it.each(Object.values(DEFAULT_FILE_CLASSIFICATION.editable).flat())(
    'classifies %s as editable',
    (extension) => {
      expect(classifyFile(extension)).toBe(FILE_SUPPORT.editable);
    },
  );

  it.each(Object.values(DEFAULT_FILE_CLASSIFICATION.readonly).flat())(
    'classifies %s as readonly',
    (extension) => {
      expect(classifyFile(extension)).toBe(FILE_SUPPORT.readonly);
    },
  );

  it('classifies unknown and missing extensions as unsupported', () => {
    expect(classifyFile('.dds')).toBe(FILE_SUPPORT.unsupported);
    expect(classifyFile('.exe')).toBe(FILE_SUPPORT.unsupported);
    expect(classifyFile(null)).toBe(FILE_SUPPORT.unsupported);
    expect(classifyFile('')).toBe(FILE_SUPPORT.unsupported);
  });

  it('keeps the catalog explicit', () => {
    expect(DEFAULT_FILE_CLASSIFICATION.editable.data).toEqual(['.yaml', '.yml', '.mod']);
    expect(DEFAULT_FILE_CLASSIFICATION.readonly.image).toContain('.png');
  });
});

describe('extensionOf', () => {
  it('returns the lower-cased extension', () => {
    expect(extensionOf('a.TXT')).toBe('.txt');
    expect(extensionOf('archive.tar.gz')).toBe('.gz');
  });

  it('returns null for names without an extension or dotfiles', () => {
    expect(extensionOf('README')).toBeNull();
    expect(extensionOf('.gitignore')).toBeNull();
    expect(extensionOf('')).toBeNull();
  });
});
