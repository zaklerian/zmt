import { describe, expect, it } from 'vitest';

import { applyAstDelta } from './ast-scoped-delta.strategy';

// ADR 022 regression gate, R3 — retargeted onto the AST-scoped-delta strategy that
// ADR 027 extracted the edit mechanism into (the component that now owns byte
// preservation; `entity-mutation.service` delegates to it). A symbol-bearing file
// must survive an UNMODIFIED patch byte-identically, and editing a NON-symbol field
// must leave every `@NAME` byte untouched (the anti-corruption property the ticket
// guarantees). The strategy is pure — `(source, delta, dialects) → bytes` — so no
// fs, no mocks, and no Electron binary are involved. The assertions are UNCHANGED
// from the pre-ADR-027 spec; only the construction moved from a mocked service
// write-capture to the strategy's return value (ADR 027 regression gate 6).

const SOURCE = [
  '@FTR_START = -5',
  '@1933 = 100',
  'technologies = {',
  '\tinfantry = {',
  '\t\tresearch_cost = 5',
  '\t\tfolder = {',
  '\t\t\tposition = { x = @FTR_START y = @1933 }',
  '\t\t}',
  '\t}',
  '}',
  '',
].join('\n');

describe('ast-scoped-delta strategy — symbol-bearing round-trip (ADR 022, R3)', () => {
  it('patches a symbol-bearing file byte-identically under an empty patch', () => {
    const out = applyAstDelta(
      SOURCE,
      { deltas: [], entityName: 'infantry', kind: 'patch' },
      [],
    );
    expect(out).toBe(SOURCE);
  });

  it('edits a non-symbol field and leaves every `@NAME` binding intact', () => {
    const out = applyAstDelta(
      SOURCE,
      {
        deltas: [
          {
            added: [],
            block: null,
            changed: [{ key: 'research_cost', value: '99' }],
            removed: [],
          },
        ],
        entityName: 'infantry',
        kind: 'patch',
      },
      [],
    );

    expect(out).toContain('research_cost = 99');
    // The position symbols were not touched by the edit, so they survive verbatim.
    expect(out).toContain('x = @FTR_START');
    expect(out).toContain('y = @1933');
    // The definitions survive too.
    expect(out).toContain('@FTR_START = -5');
    expect(out).toContain('@1933 = 100');
  });
});
