import { describe, expect, it } from 'vitest';

import type { WriteTarget, WriteTargets } from './write-target.model';

import { resolveWriteTarget } from './resolve-write-target.util';
import { WRITE_KINDS } from './write-kind.const';

// ZMT-57 regression gate 1 — the consult point itself (ADR 029 decisions 2 and 5),
// and gate 5's per-mod scoping, which IS this function's lookup rule. Pure: no
// store, no filesystem, no Electron.

const FALLBACK: WriteTarget = {
  modId: 'bice',
  relativePath: 'common/technologies/air_techs.txt',
};

const TARGETS: WriteTargets = {
  bice: { technology: 'common/technologies/zmt_new.txt' },
  other: { technology: 'common/technologies/other_mod.txt' },
};

describe('resolveWriteTarget', () => {
  it('returns the stored preference when one is set for (mod, kind)', () => {
    expect(
      resolveWriteTarget(WRITE_KINDS.technology, FALLBACK, TARGETS),
    ).toEqual({
      modId: 'bice',
      relativePath: 'common/technologies/zmt_new.txt',
    });
  });

  it('returns the call site’s fallback when the kind has no stored target', () => {
    expect(resolveWriteTarget(WRITE_KINDS.locKey, FALLBACK, TARGETS)).toBe(
      FALLBACK,
    );
  });

  it('returns the fallback when nothing is stored at all', () => {
    expect(resolveWriteTarget(WRITE_KINDS.technology, FALLBACK, {})).toBe(
      FALLBACK,
    );
  });

  // Gate 5: the mod is the OUTER key and the fallback names which mod the write
  // resolved to, so another mod's stored target is never read for this write.
  it('never reads another mod’s target', () => {
    const otherMod: WriteTarget = {
      modId: 'third',
      relativePath: 'common/technologies/third.txt',
    };
    expect(resolveWriteTarget(WRITE_KINDS.technology, otherMod, TARGETS)).toBe(
      otherMod,
    );
  });

  // Decision 5's staleness rule as it is resolvable without the filesystem: a mod
  // removed and re-added mints a new id, so its orphaned entry is simply not found
  // and the write keeps today's behavior instead of erroring.
  it('falls back for a mod id that no longer matches a stored entry', () => {
    expect(
      resolveWriteTarget(
        WRITE_KINDS.technology,
        { ...FALLBACK, modId: 'bice-readded' },
        TARGETS,
      ),
    ).toEqual({ ...FALLBACK, modId: 'bice-readded' });
  });

  it('refuses when the call site has no fallback — it never invents a file', () => {
    expect(
      resolveWriteTarget(WRITE_KINDS.technology, null, TARGETS),
    ).toBeNull();
  });

  it('treats a blank stored path as unset rather than as a target', () => {
    expect(
      resolveWriteTarget(WRITE_KINDS.technology, FALLBACK, {
        bice: { technology: '   ' },
      }),
    ).toBe(FALLBACK);
  });
});
