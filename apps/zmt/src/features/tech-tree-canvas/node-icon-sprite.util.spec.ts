import { describe, expect, it } from 'vitest';

import { nodeIconSprite } from './node-icon-sprite.util';

describe('nodeIconSprite', () => {
  // The Step 1 grounding rule, confirmed against real BICE tokens
  // (docs/grounding/ZMT-44-icon-sprite-name.md).
  it('derives GFX_<token>_medium for a wide tech (its own icon, not the equipment)', () => {
    expect(nodeIconSprite('fighter1')).toBe('GFX_fighter1_medium');
    expect(nodeIconSprite('multi_role1')).toBe('GFX_multi_role1_medium');
  });

  it('applies the same rule to a no-icon token — the sprite the asset stack fails to resolve', () => {
    // `generic_fighter` (hidden root) and `cv_fighter1` (sub) carry no sprite in
    // BICE; the name is still well-formed and resolves `unresolved` → fallback.
    expect(nodeIconSprite('generic_fighter')).toBe(
      'GFX_generic_fighter_medium',
    );
    expect(nodeIconSprite('cv_fighter1')).toBe('GFX_cv_fighter1_medium');
  });
});
