import { parse } from '@paradox-parser';
import { describe, expect, it } from 'vitest';

import { extractTechnologyCategories } from './extract-technology-categories.util';

describe('extractTechnologyCategories', () => {
  it('emits one entity per bare token declared under technology_categories', () => {
    const script = parse(
      [
        'technology_categories = {',
        '\tair_equipment',
        '\tcat_strategic_destruction',
        '\tarmor',
        '}',
      ].join('\n'),
    );
    expect(extractTechnologyCategories(script)).toEqual([
      { id: 'air_equipment' },
      { id: 'cat_strategic_destruction' },
      { id: 'armor' },
    ]);
  });

  it('ignores the technology_folders block in the same file (Q61)', () => {
    const script = parse(
      [
        'technology_categories = {',
        '\tinfantry_weapons',
        '}',
        'technology_folders = {',
        '\tinfantry_folder = {',
        '\t\tledger = army',
        '\t\tavailable = { always = yes }',
        '\t}',
        '}',
      ].join('\n'),
    );
    expect(extractTechnologyCategories(script)).toEqual([
      { id: 'infantry_weapons' },
    ]);
  });

  it('skips comments interleaved with the token list', () => {
    const script = parse(
      [
        'technology_categories = {',
        '\t## LAND',
        '\tartillery',
        '\tlight_artillery',
        '}',
      ].join('\n'),
    );
    expect(
      extractTechnologyCategories(script).map((entity) => entity.id),
    ).toEqual(['artillery', 'light_artillery']);
  });

  it('returns nothing for a file with no technology_categories block', () => {
    const script = parse('technology_folders = { infantry_folder = { } }');
    expect(extractTechnologyCategories(script)).toEqual([]);
  });
});
