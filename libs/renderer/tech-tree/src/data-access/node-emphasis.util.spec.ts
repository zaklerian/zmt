import type { TechTreeNode } from '../util';

import { matchesTechnologySearch, toNodeView } from './node-emphasis.util';

const FIGHTER: TechTreeNode = {
  categories: ['air_equipment'],
  id: 'fighter1',
  kind: 'simple',
  position: { x: 0, y: 0 },
  token: 'fighter1',
};

describe('matchesTechnologySearch', () => {
  it('matches nothing on a blank query and the token or name otherwise', () => {
    expect(matchesTechnologySearch('  ', 'fighter1', 'Interwar Fighter')).toBe(false);
    expect(matchesTechnologySearch('FIGHT', 'fighter1', null)).toBe(true);
    expect(matchesTechnologySearch('interwar', 'fighter1', 'Interwar Fighter')).toBe(true);
    expect(matchesTechnologySearch('bomber', 'fighter1', 'Interwar Fighter')).toBe(false);
  });
});

describe('toNodeView', () => {
  it('resolves the name, highlight, dimming and selection for a node', () => {
    const view = toNodeView(FIGHTER, {
      names: { fighter1: 'Interwar Fighter' },
      search: 'interwar',
      selectedCategories: new Set(['naval_equipment']),
      selectedId: 'fighter1',
    });
    expect(view).toMatchObject({
      dimmed: false,
      highlighted: true,
      name: 'Interwar Fighter',
      selected: true,
    });
  });

  it('dims a node outside the selected categories only when it is not a search hit', () => {
    const dimmed = toNodeView(FIGHTER, {
      names: {},
      search: '',
      selectedCategories: new Set(['naval_equipment']),
      selectedId: null,
    });
    expect(dimmed).toMatchObject({ dimmed: true, highlighted: false, name: null, selected: false });
    const kept = toNodeView(FIGHTER, {
      names: {},
      search: '',
      selectedCategories: new Set(),
      selectedId: null,
    });
    expect(kept.dimmed).toBe(false);
  });
});
