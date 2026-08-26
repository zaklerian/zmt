import { describe, expect, it } from 'vitest';

import { matchesTechnologySearch } from './tech-search.util';

describe('matchesTechnologySearch', () => {
  // Req 4: the search matches BOTH names a technology answers to — the token the
  // node label carries and the public name the user thinks in.
  it('matches the token', () => {
    expect(
      matchesTechnologySearch('fighter', {
        name: 'Air Superiority',
        token: 'early_fighter',
      }),
    ).toBe(true);
  });

  it('matches the public name', () => {
    expect(
      matchesTechnologySearch('superiority', {
        name: 'Air Superiority',
        token: 'early_fighter',
      }),
    ).toBe(true);
  });

  it('matches case-insensitively on either name', () => {
    expect(
      matchesTechnologySearch('FIGHT', {
        name: null,
        token: 'early_fighter',
      }),
    ).toBe(true);
    expect(
      matchesTechnologySearch('AIR sup', {
        name: 'Air Superiority',
        token: 'early_fighter',
      }),
    ).toBe(true);
  });

  // An unlocalised technology is still findable — the missing name surfaces as an
  // absence, it is not substituted for (R-CODE-5).
  it('still matches by token when no source localises the name', () => {
    expect(
      matchesTechnologySearch('early', { name: null, token: 'early_fighter' }),
    ).toBe(true);
    expect(
      matchesTechnologySearch('superiority', {
        name: null,
        token: 'early_fighter',
      }),
    ).toBe(false);
  });

  // Highlight-not-hide means an empty box is the resting state, not a match-all.
  it('matches nothing for an empty or whitespace-only query', () => {
    expect(
      matchesTechnologySearch('', { name: 'Air Superiority', token: 'f1' }),
    ).toBe(false);
    expect(
      matchesTechnologySearch('   ', { name: 'Air Superiority', token: 'f1' }),
    ).toBe(false);
  });

  it('does not match an unrelated query', () => {
    expect(
      matchesTechnologySearch('bomber', {
        name: 'Air Superiority',
        token: 'early_fighter',
      }),
    ).toBe(false);
  });
});
