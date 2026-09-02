import type { AppApiModel, WriteTargets } from '@contracts';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mergeWriteTarget, writeTargetsService } from './write-targets.service';

// ZMT-57 regression gate 5 — persistence and its per-mod scoping. The STORE is the
// existing `preferences:get` / `preferences:set` pair (ADR 029 decision 4: no new
// store, no new channel), so "persists across reload" is asserted as what this
// writes to and reads back from it; the store's own durability is
// `preferences-store.service.ts`, already shipped.

const get = vi.fn();
const set = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { preferences: { get, set } } as unknown as AppApiModel,
    writable: true,
  });
  set.mockResolvedValue(undefined);
});

describe('writeTargetsService', () => {
  it('reads the stored record back — the same value a reload would see', async () => {
    const stored: WriteTargets = {
      bice: { technology: 'common/technologies/zmt_new.txt' },
    };
    get.mockResolvedValue(stored);

    expect(await writeTargetsService.get()).toEqual(stored);
    expect(get).toHaveBeenCalledWith('writeTargets');
  });

  it('reads an unset preference as empty rather than null', async () => {
    get.mockResolvedValue(null);

    expect(await writeTargetsService.get()).toEqual({});
  });

  it('persists a chosen target under the one preference key', async () => {
    get.mockResolvedValue({});

    await writeTargetsService.set(
      'bice',
      'technology',
      'common/technologies/zmt_new.txt',
    );

    expect(set).toHaveBeenCalledWith('writeTargets', {
      bice: { technology: 'common/technologies/zmt_new.txt' },
    });
  });

  it('leaves another mod’s targets untouched when one mod’s is set', async () => {
    get.mockResolvedValue({
      other: { technology: 'common/technologies/other.txt' },
    });

    await writeTargetsService.set(
      'bice',
      'locKey',
      'localisation/english/zmt_l_english.yml',
    );

    expect(set).toHaveBeenCalledWith('writeTargets', {
      bice: { locKey: 'localisation/english/zmt_l_english.yml' },
      other: { technology: 'common/technologies/other.txt' },
    });
  });
});

describe('mergeWriteTarget', () => {
  it('leaves the other kinds of the same mod alone', () => {
    expect(
      mergeWriteTarget(
        {
          bice: {
            locKey: 'localisation/english/a_l_english.yml',
            technology: 'common/technologies/a.txt',
          },
        },
        'bice',
        'technology',
        'common/technologies/b.txt',
      ),
    ).toEqual({
      bice: {
        locKey: 'localisation/english/a_l_english.yml',
        technology: 'common/technologies/b.txt',
      },
    });
  });

  // Clearing REMOVES the key rather than storing '', so an unset kind reads to
  // `resolveWriteTarget` exactly as it did before anything was ever stored.
  it('removes the entry when the target is cleared', () => {
    expect(
      mergeWriteTarget(
        {
          bice: {
            locKey: 'localisation/english/a_l_english.yml',
            technology: 'common/technologies/a.txt',
          },
        },
        'bice',
        'technology',
        null,
      ),
    ).toEqual({ bice: { locKey: 'localisation/english/a_l_english.yml' } });
  });
});
