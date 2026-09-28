import type { ModDescriptorValues } from './mod-descriptor.model';

import { EMPTY_DESCRIPTOR_VALUES } from './mod-descriptor.model';
import {
  defaultDescriptorValues,
  descriptorValues,
  parseDescriptor,
  quote,
  serializeDescriptor,
  tokenize,
} from './mod-descriptor.util';

const SOURCE = [
  'version="0.1"',
  'tags={',
  '\t"Gameplay"',
  '\t"Historical"',
  '}',
  'name="My \\"Mod\\""',
  'supported_version="1.14.*"',
  '# a comment = ignored',
  'picture="thumbnail.png"',
  'remote_file_id="123"',
  'path="mod/my-mod"',
  '',
].join('\n');

const VALUES: ModDescriptorValues = {
  name: 'My "Mod"',
  path: 'mod/my-mod',
  picture: 'thumbnail.png',
  supportedVersion: '1.14.*',
  tags: ['Gameplay', 'Historical'],
  version: '0.1',
};

describe('tokenize', () => {
  it('splits words, quoted strings, braces and equals and skips comments', () => {
    expect(tokenize('a = "b c" { d } # e').map((token) => token.text)).toEqual([
      'a',
      '=',
      '"b c"',
      '{',
      'd',
      '}',
    ]);
    expect(tokenize('x="unterminated').map((token) => token.text)).toEqual([
      'x',
      '=',
      '"unterminated',
    ]);
    expect(tokenize('key=value#tail')[2]).toMatchObject({ from: 4, text: 'value', to: 9 });
  });
});

describe('parseDescriptor', () => {
  it('reads every field, keeps unknown keys and unescapes strings', () => {
    const document = parseDescriptor(SOURCE);
    expect(document.warnings).toEqual([]);
    expect(document.statements.map((statement) => statement.key)).toEqual([
      'version',
      'tags',
      'name',
      'supported_version',
      'picture',
      'remote_file_id',
      'path',
    ]);
    expect(descriptorValues(document)).toEqual(VALUES);
  });

  it('reads unquoted scalars, inline lists and the last of repeated keys', () => {
    const document = parseDescriptor('version=1.0\ntags={ a b }\nversion=2.0\n');
    expect(descriptorValues(document)).toEqual({
      ...EMPTY_DESCRIPTOR_VALUES,
      tags: ['a', 'b'],
      version: '2.0',
    });
  });

  it('treats a list where a scalar is expected as empty and vice versa', () => {
    const document = parseDescriptor('name={ a }\ntags="x"');
    expect(descriptorValues(document)).toEqual({ ...EMPTY_DESCRIPTOR_VALUES });
  });

  it('warns about malformed statements and continues', () => {
    const document = parseDescriptor('= "x"\nname==\ntags={ "a" = }\nb={ c={ d } }\nversion\nk={');
    expect(document.warnings.map((warning) => warning.message)).toEqual([
      'Unexpected "="',
      'Expected "=" after ""x""',
      'Missing value for "name"',
      'Unexpected "="',
      'Unexpected assignment inside a list',
      'Unexpected assignment inside a list',
      'Nested block is kept verbatim but not editable',
      'Expected "=" after "version"',
      'Unterminated block',
    ]);
    expect(document.warnings[0]).toEqual({ from: 0, message: 'Unexpected "="', to: 1 });
    expect(descriptorValues(document).tags).toEqual(['a']);
    const nested = document.statements.find((statement) => statement.key === 'b');
    expect(nested?.value.kind === 'list' && nested.value.items.map((item) => item.text)).toEqual([
      'c',
    ]);
  });

  it('exposes the default values', () => {
    expect(defaultDescriptorValues()).toEqual(EMPTY_DESCRIPTOR_VALUES);
    expect(quote('a"b')).toBe('"a\\"b"');
  });
});

describe('serializeDescriptor', () => {
  it('returns the source untouched when nothing changed', () => {
    const document = parseDescriptor(SOURCE);
    expect(serializeDescriptor(document, VALUES)).toBe(SOURCE);
  });

  it('replaces changed scalars in place and keeps everything else verbatim', () => {
    const document = parseDescriptor(SOURCE);
    const output = serializeDescriptor(document, { ...VALUES, path: '', version: '0.2' });
    expect(output).toBe(
      SOURCE.replace('version="0.1"', 'version="0.2"').replace('path="mod/my-mod"', 'path=""'),
    );
    expect(descriptorValues(parseDescriptor(output))).toEqual({
      ...VALUES,
      path: '',
      version: '0.2',
    });
  });

  it('rewrites a multi-line tag list with the existing indentation', () => {
    const document = parseDescriptor(SOURCE);
    const output = serializeDescriptor(document, { ...VALUES, tags: ['Alternative History'] });
    expect(output).toContain('tags={\n\t"Alternative History"\n}\nname=');
    expect(descriptorValues(parseDescriptor(output)).tags).toEqual(['Alternative History']);
  });

  it('rewrites an inline tag list inline and an empty list on one line', () => {
    const inline = parseDescriptor('tags={ "a" }\n');
    expect(serializeDescriptor(inline, { ...EMPTY_DESCRIPTOR_VALUES, tags: ['b', 'c'] })).toBe(
      'tags={ "b" "c" }\n',
    );
    const empty = parseDescriptor('tags={}\n');
    expect(serializeDescriptor(empty, { ...EMPTY_DESCRIPTOR_VALUES, tags: ['x'] })).toBe(
      'tags={\n\t"x"\n}\n',
    );
    const indented = parseDescriptor('  tags = {\n    "a"\n  }\n');
    expect(serializeDescriptor(indented, { ...EMPTY_DESCRIPTOR_VALUES, tags: ['b'] })).toBe(
      '  tags = {\n    "b"\n  }\n',
    );
  });

  it('turns a scalar tags value into a list when tags are set', () => {
    const document = parseDescriptor('tags="x"\n');
    expect(serializeDescriptor(document, { ...EMPTY_DESCRIPTOR_VALUES, tags: ['a'] })).toBe(
      'tags={\n\t"a"\n}\n',
    );
  });

  it('appends missing keys with non-empty values and skips empty ones', () => {
    const document = parseDescriptor('remote_file_id="1"');
    expect(
      serializeDescriptor(document, { ...EMPTY_DESCRIPTOR_VALUES, name: 'New', tags: ['t'] }),
    ).toBe('remote_file_id="1"\nname="New"\ntags={\n\t"t"\n}\n');
    expect(serializeDescriptor(parseDescriptor(''), EMPTY_DESCRIPTOR_VALUES)).toBe('');
    expect(
      serializeDescriptor(parseDescriptor(''), { ...EMPTY_DESCRIPTOR_VALUES, version: '1' }),
    ).toBe('version="1"\n');
  });
});
