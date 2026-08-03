import { describe, expect, it } from 'vitest';

import { classifyEntityFile } from './entity-type.const';

describe('classifyEntityFile', () => {
  it('classifies each entity type by its directory chain', () => {
    expect(classifyEntityFile('common/characters/leaders.txt')).toBe(
      'character',
    );
    expect(classifyEntityFile('common/units/equipment/inf.txt')).toBe(
      'equipment',
    );
    expect(classifyEntityFile('common/ideologies/ideo.txt')).toBe('ideology');
    expect(classifyEntityFile('common/units/equipment/modules/m.txt')).toBe(
      'module',
    );
    expect(classifyEntityFile('history/states/1.txt')).toBe('state');
    expect(classifyEntityFile('common/technologies/inf.txt')).toBe(
      'technology',
    );
    expect(classifyEntityFile('common/technology_tags/00_technology.txt')).toBe(
      'technologyCategory',
    );
  });

  it('disambiguates module from equipment by the innermost directory', () => {
    // The equipment chain is a prefix of the module chain; the "directly inside"
    // rule means an equipment-dir file is never classified as module and vice versa.
    expect(classifyEntityFile('common/units/equipment/archetypes.txt')).toBe(
      'equipment',
    );
    expect(classifyEntityFile('common/units/equipment/modules/x.txt')).toBe(
      'module',
    );
  });

  it('matches the chain anywhere in the path (mod-root agnostic)', () => {
    expect(classifyEntityFile('mods/bice/common/technologies/inf.txt')).toBe(
      'technology',
    );
  });

  it('returns null for a non-.txt file', () => {
    expect(classifyEntityFile('common/technologies/inf.yml')).toBeNull();
  });

  it('returns null for a file not directly inside the chain', () => {
    expect(classifyEntityFile('common/technologies/sub/inf.txt')).toBeNull();
  });

  it('returns null for an unrecognized directory', () => {
    expect(classifyEntityFile('common/ideas/country.txt')).toBeNull();
  });
});
