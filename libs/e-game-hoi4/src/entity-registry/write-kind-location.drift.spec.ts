import { WRITE_KIND_LOCATIONS } from '@contracts';
import { describe, expect, it } from 'vitest';

import { ENTITY_REGISTRY } from './entity-registry.const';

// ZMT-57 — the guard the ADR 029 decision 1 "reuses that entry and does not restate
// it" rule asks for, in the only form available: the settings surface that draws the
// per-kind file picker is RENDERER code, and `ENTITY_REGISTRY` is a main-side lib the
// renderer may not import (R-REACT-1). The folder therefore lives in @contracts, the
// one surface both processes share, and this spec is what keeps the two from
// drifting — a folder moved in the registry fails here rather than silently pointing
// the picker at a directory nothing is written to.
describe('WRITE_KIND_LOCATIONS vs ENTITY_REGISTRY', () => {
  it('pins the technology kind to the registry’s folder', () => {
    expect(WRITE_KIND_LOCATIONS.technology.folder).toBe(
      ENTITY_REGISTRY.technology.folder,
    );
  });

  it('pins the sprite kind to the registry’s folder and extension', () => {
    expect(WRITE_KIND_LOCATIONS.sprite.folder).toBe(
      ENTITY_REGISTRY.sprite.folder,
    );
    expect(WRITE_KIND_LOCATIONS.sprite.extension).toBe(
      ENTITY_REGISTRY.sprite.extension,
    );
  });

  // The registry omits `extension` for the Clausewitz default; the picker cannot,
  // because it filters a real directory listing.
  it('uses the registry’s default extension where the entry declares none', () => {
    expect(
      'extension' in ENTITY_REGISTRY.technology
        ? ENTITY_REGISTRY.technology.extension
        : '.txt',
    ).toBe(WRITE_KIND_LOCATIONS.technology.extension);
  });
});
