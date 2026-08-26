import { describe, expect, it } from 'vitest';

import { resolveNodeEmphasis } from './canvas-node-emphasis.util';

const FIGHTER = {
  categories: ['air_equipment', 'light_air'],
  name: 'Air Superiority',
  token: 'early_fighter',
};

function emphasis(
  overrides: Partial<Parameters<typeof resolveNodeEmphasis>[0]> = {},
) {
  return resolveNodeEmphasis({
    ...FIGHTER,
    search: '',
    selectedCategories: new Set<string>(),
    ...overrides,
  });
}

describe('resolveNodeEmphasis', () => {
  // Gate 1: a match is an emphasis, and everything else stays exactly as it was —
  // the util has no third state that could remove a node.
  it('highlights a search match and leaves a non-match untouched', () => {
    expect(emphasis({ search: 'superiority' })).toEqual({
      dimmed: false,
      highlighted: true,
    });
    expect(emphasis({ search: 'bomber' })).toEqual({
      dimmed: false,
      highlighted: false,
    });
  });

  // Gate 2: no selection = nothing dimmed; a selection dims only what is outside it.
  it('dims nothing until a category is selected', () => {
    expect(emphasis({ selectedCategories: new Set() })).toEqual({
      dimmed: false,
      highlighted: false,
    });
  });

  it('dims a technology outside every selected category', () => {
    expect(
      emphasis({ selectedCategories: new Set(['naval_equipment']) }),
    ).toEqual({ dimmed: true, highlighted: false });
  });

  it('leaves a technology in any selected category undimmed', () => {
    expect(
      emphasis({
        selectedCategories: new Set(['light_air', 'naval_equipment']),
      }),
    ).toEqual({ dimmed: false, highlighted: false });
  });

  // Gate 3: the composition rule — a filtered-out node the query matched resolves
  // to highlighted-and-undimmed. Search wins; a hit the user cannot see is not a hit.
  it('resolves a filter-dimmed but search-matched node to highlighted, not dimmed', () => {
    expect(
      emphasis({
        search: 'superiority',
        selectedCategories: new Set(['naval_equipment']),
      }),
    ).toEqual({ dimmed: false, highlighted: true });
  });

  it('keeps dimming a filtered-out node the query did not match', () => {
    expect(
      emphasis({
        search: 'bomber',
        selectedCategories: new Set(['naval_equipment']),
      }),
    ).toEqual({ dimmed: true, highlighted: false });
  });

  // A technology declaring no categories is outside any selection, and dims — the
  // data says it belongs to none, and inventing membership would be a fabrication.
  it('dims a technology that declares no categories once a filter is active', () => {
    expect(
      emphasis({
        categories: [],
        selectedCategories: new Set(['light_air']),
      }),
    ).toEqual({ dimmed: true, highlighted: false });
  });
});
