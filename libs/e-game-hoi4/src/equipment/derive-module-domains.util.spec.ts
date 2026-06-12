import { describe, expect, it } from 'vitest';

import { deriveModuleDomains } from './derive-module-domains.util';

describe('deriveModuleDomains', () => {
  it('stamps a single archetype domain onto all its slot categories', () => {
    const index = deriveModuleDomains([
      { categories: ['air_engine', 'fixed_air_weapon'], domain: 'air' },
    ]);

    expect(index.get('air_engine')).toBe('air');
    expect(index.get('fixed_air_weapon')).toBe('air');
    expect(index.size).toBe(2);
  });

  it('reinforces a category two same-domain archetypes both accept', () => {
    const index = deriveModuleDomains([
      { categories: ['ship_torpedo'], domain: 'naval' },
      { categories: ['ship_torpedo'], domain: 'naval' },
    ]);

    expect(index.get('ship_torpedo')).toBe('naval');
  });

  it('excludes a category two differing-domain archetypes both accept', () => {
    const index = deriveModuleDomains([
      { categories: ['shared_slot'], domain: 'air' },
      { categories: ['shared_slot'], domain: 'land' },
    ]);

    expect(index.has('shared_slot')).toBe(false);
    expect(index.get('shared_slot')).toBeUndefined();
  });

  it('keeps a category conflicted even when a later archetype agrees again', () => {
    const index = deriveModuleDomains([
      { categories: ['shared_slot'], domain: 'air' },
      { categories: ['shared_slot'], domain: 'land' },
      { categories: ['shared_slot'], domain: 'air' },
    ]);

    expect(index.has('shared_slot')).toBe(false);
  });

  it('omits a category only a domain-conflicted set of archetypes reference', () => {
    const index = deriveModuleDomains([
      { categories: ['air_engine'], domain: 'air' },
      { categories: ['contested'], domain: 'air' },
      { categories: ['contested'], domain: 'naval' },
    ]);

    expect(index.get('air_engine')).toBe('air');
    expect(index.has('contested')).toBe(false);
    expect(index.size).toBe(1);
  });

  it('returns an empty index for empty input', () => {
    expect(deriveModuleDomains([]).size).toBe(0);
  });
});
