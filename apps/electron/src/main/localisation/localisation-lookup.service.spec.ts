import { WRITE_KIND_LOCATIONS } from '@contracts';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { IndexSource } from '../entity-index';

import { lookupLocalisation } from './localisation-lookup.service';

// ZMT-50 — localisation resolution across sources, driven against a REAL scratch
// mirror of real BICE loc byte-shapes (BOM'd, ` KEY:VERSION "value"`, mixed
// versions). Pure Node, no Electron binary: `sources` are passed in.

const BOM = '﻿';
const l = (...lines: readonly string[]): string => lines.join('\n');

const VANILLA_LOC =
  BOM +
  l('l_english:', ' fighter1:0 "Fighter I"', ' shared_key:0 "Vanilla"', '');
const MOD_LOC =
  BOM +
  l(
    'l_english:',
    ' tech_spitfire_equipment_1:0 "Supermarine Spitfire"',
    ' shared_key:2 "Mod override"',
    '',
  );

describe('lookupLocalisation', () => {
  let scratchRoot: string;
  let vanillaRoot: string;
  let modRoot: string;

  const sources = (): readonly IndexSource[] => [
    { modId: null, path: vanillaRoot, permission: 'readonly' },
    { modId: 'bice', path: modRoot, permission: 'editable' },
  ];

  const lookup = (keys: readonly string[]) =>
    lookupLocalisation(keys, { language: 'english', sources: sources() });

  beforeEach(async () => {
    scratchRoot = await fs.realpath(
      await fs.mkdtemp(path.join(os.tmpdir(), 'zmt-loc-')),
    );
    vanillaRoot = path.join(scratchRoot, 'hoi4');
    modRoot = path.join(scratchRoot, 'bice');
    await fs.mkdir(path.join(vanillaRoot, 'localisation/english'), {
      recursive: true,
    });
    await fs.mkdir(path.join(modRoot, 'localisation/english'), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(vanillaRoot, 'localisation/english/core_l_english.yml'),
      VANILLA_LOC,
    );
    await fs.writeFile(
      path.join(modRoot, 'localisation/english/equipment_l_english.yml'),
      MOD_LOC,
    );
  });

  afterEach(async () => {
    await fs.rm(scratchRoot, { force: true, recursive: true });
  });

  it('resolves a mod key to its owning editable file', async () => {
    const { entries } = await lookup(['tech_spitfire_equipment_1']);

    expect(entries).toEqual([
      {
        key: 'tech_spitfire_equipment_1',
        permission: 'editable',
        target: {
          modId: 'bice',
          relativePath: 'localisation/english/equipment_l_english.yml',
        },
        value: 'Supermarine Spitfire',
        version: '0',
      },
    ]);
  });

  it('resolves a vanilla-only key as readonly with no write target', async () => {
    const { entries } = await lookup(['fighter1']);

    expect(entries).toEqual([
      {
        key: 'fighter1',
        permission: 'readonly',
        target: null,
        value: 'Fighter I',
        version: '0',
      },
    ]);
  });

  it('lets the higher-precedence source win a same-key definition', async () => {
    const { entries } = await lookup(['shared_key']);

    expect(entries[0].value).toBe('Mod override');
    expect(entries[0].version).toBe('2');
    expect(entries[0].permission).toBe('editable');
  });

  it('omits keys no source defines', async () => {
    const { entries } = await lookup(['no_such_key']);

    expect(entries).toEqual([]);
  });

  it('returns the highest-precedence editable source’s first loc file as the default insert target (ADR 028 D6 seam)', async () => {
    await fs.writeFile(
      path.join(modRoot, 'localisation/english/BI_first_l_english.yml'),
      MOD_LOC,
    );

    const { defaultTarget } = await lookup([]);

    expect(defaultTarget).toEqual({
      modId: 'bice',
      relativePath: 'localisation/english/BI_first_l_english.yml',
    });
  });

  it('has no default target when no editable source carries a loc file', async () => {
    const { defaultTarget } = await lookupLocalisation([], {
      language: 'english',
      sources: [{ modId: null, path: vanillaRoot, permission: 'readonly' }],
    });

    expect(defaultTarget).toBeNull();
  });

  it('matches the language by the `_l_<language>` filename suffix, not the directory', async () => {
    await fs.writeFile(
      path.join(modRoot, 'localisation/english/other_l_german.yml'),
      BOM + l('l_german:', ' german_only:0 "Nur Deutsch"', ''),
    );

    expect((await lookup(['german_only'])).entries).toEqual([]);
  });

  // ZMT-57 regression gate 2 — the loc seam is now the ADR 029 consult point.
  describe('the save-target preference (ZMT-57 gate 2)', () => {
    it('keeps the derived default, and no seed, when no target is set', async () => {
      const result = await lookupLocalisation([], {
        language: 'english',
        sources: sources(),
        writeTargets: { bice: { technology: 'common/technologies/x.txt' } },
      });

      expect(result.defaultTarget).toEqual({
        modId: 'bice',
        relativePath: 'localisation/english/equipment_l_english.yml',
      });
      expect(result.defaultTargetSeedLanguage).toBeNull();
    });

    it('returns the chosen file, and its seed language, when one is set', async () => {
      const result = await lookupLocalisation([], {
        language: 'english',
        sources: sources(),
        writeTargets: {
          bice: { locKey: 'localisation/english/zmt_new_l_english.yml' },
        },
      });

      expect(result.defaultTarget).toEqual({
        modId: 'bice',
        relativePath: 'localisation/english/zmt_new_l_english.yml',
      });
      expect(result.defaultTargetSeedLanguage).toBe('english');
    });

    // The preference chooses the FILE inside the mod the write already resolved to
    // and never moves the write to another mod (ADR 029 decision 4).
    it('ignores a target stored under a different mod', async () => {
      const result = await lookupLocalisation([], {
        language: 'english',
        sources: sources(),
        writeTargets: {
          other: { locKey: 'localisation/english/other_l_english.yml' },
        },
      });

      expect(result.defaultTarget).toEqual({
        modId: 'bice',
        relativePath: 'localisation/english/equipment_l_english.yml',
      });
      expect(result.defaultTargetSeedLanguage).toBeNull();
    });

    // The enumerator's own folder rule is private to `enumerate-loc-files.util.ts`;
    // building the scratch tree from the CONTRACT's folder is what pins the picker's
    // notion of "where loc lives" to the one the lookup actually walks.
    it('enumerates the folder the locKey write-kind declares', async () => {
      const declared = path.join(
        modRoot,
        WRITE_KIND_LOCATIONS.locKey.folder,
        `zmt_declared_l_english${WRITE_KIND_LOCATIONS.locKey.extension}`,
      );
      await fs.writeFile(
        declared,
        BOM + l('l_english:', ' declared_key:0 "Declared"', ''),
      );

      expect((await lookup(['declared_key'])).entries).toHaveLength(1);
    });
  });
});
