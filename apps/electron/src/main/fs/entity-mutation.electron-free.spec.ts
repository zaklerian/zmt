import { IPC_ERROR_CODES, ProjectedSource } from '@contracts';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { EntityMutationConfig } from './entity-mutation.service';

import { entityMutationService } from './entity-mutation.service';

// ADR 027 decision 6 enabling gate. The write path is now Electron-free: it takes
// its config as parameters and never reaches a store. This spec drives the REAL
// service against a REAL scratch mirror through the REAL path guard, write-file
// service, parser, and `node:fs` — NOTHING is mocked. Before this ticket the same
// write reached `workspaceStoreService.get()` inside `loadAndLocate` (and the path
// guard reached it again), which constructs an `electron-store` and throws without
// the Electron `app`; there was also no config parameter to pass. So this test
// could not have passed before the inversion. Its passing IS the proof that the
// write path constructs and executes a real write with no Electron binary and no
// electron-store — if either store were reached, `new ElectronStore()` would throw
// here and fail the test.

// The seven-entity save baseline (ADR 026 / ADR 027 regression gate): the six HOI4
// entity forms — character, plane (equipment), ideology, module, state, technology
// — plus the mod descriptor. Each fixture exercises a distinct Clausewitz construct
// (nested blocks, object-lists, bare value-list tokens, `@`-symbols, quoted
// strings) so a byte-drift in parse→locate→serialize would surface on at least one.
const l = (...lines: readonly string[]): string => lines.join('\n');

interface EntityFixture {
  readonly content: string;
  readonly entityName: string;
  readonly label: string;
  readonly relativePath: string;
}

const FIXTURES: readonly EntityFixture[] = [
  {
    content: l(
      'characters = {',
      '\tTEST_political_advisor = {',
      '\t\tname = "Test Advisor"',
      '\t\tadvisor = {',
      '\t\t\tslot = political_advisor',
      '\t\t\ttraits = { captain_of_industry }',
      '\t\t}',
      '\t\tportraits = {',
      '\t\t\tcivilian = {',
      '\t\t\t\tlarge = "gfx/leaders/TEST.dds"',
      '\t\t\t}',
      '\t\t}',
      '\t}',
      '}',
      '',
    ),
    entityName: 'TEST_political_advisor',
    label: 'character',
    relativePath: 'common/characters/00_test.txt',
  },
  {
    content: l(
      'equipments = {',
      '\ttest_fighter = {',
      '\t\tyear = 1936',
      '\t\tis_archetype = yes',
      '\t\ttype = { fighter }',
      '\t\tbuild_cost_ic = 20',
      '\t\treliability = 0.8',
      '\t}',
      '}',
      '',
    ),
    entityName: 'test_fighter',
    label: 'plane (equipment)',
    relativePath: 'common/units/equipment/test_plane.txt',
  },
  {
    content: l(
      'ideologies = {',
      '\ttest_ideology = {',
      '\t\ttypes = {',
      '\t\t\ttest_subtype = {',
      '\t\t\t}',
      '\t\t}',
      '\t\tcolor = { 120 0 0 }',
      '\t\trules = {',
      '\t\t\tcan_force_government = yes',
      '\t\t}',
      '\t}',
      '}',
      '',
    ),
    entityName: 'test_ideology',
    label: 'ideology',
    relativePath: 'common/ideologies/00_test.txt',
  },
  {
    content: l(
      'equipment_modules = {',
      '\ttest_module = {',
      '\t\tcategory = special_type',
      '\t\tadd_stats = {',
      '\t\t\tbuild_cost_ic = 1.0',
      '\t\t\treliability = 0.05',
      '\t\t}',
      '\t}',
      '}',
      '',
    ),
    entityName: 'test_module',
    label: 'module',
    relativePath: 'common/units/equipment/modules/test_modules.txt',
  },
  {
    content: l(
      'state = {',
      '\tid = 999',
      '\tname = "STATE_999"',
      '\tmanpower = 1000',
      '\thistory = {',
      '\t\towner = ENG',
      '\t\tbuildings = {',
      '\t\t\tinfrastructure = 3',
      '\t\t}',
      '\t\tadd_core_of = ENG',
      '\t}',
      '\tprovinces = {',
      '\t\t1234 5678',
      '\t}',
      '}',
      '',
    ),
    entityName: 'state',
    label: 'state',
    relativePath: 'history/states/999-Test.txt',
  },
  {
    content: l(
      '@1936 = 0',
      '@FTR_COL = 1',
      'technologies = {',
      '\ttest_tech = {',
      '\t\tresearch_cost = 2',
      '\t\tstart_year = 1936',
      '\t\tfolder = {',
      '\t\t\tname = air_techs_folder',
      '\t\t\tposition = { x = @FTR_COL y = @1936 }',
      '\t\t}',
      '\t\tcategories = {',
      '\t\t\tair_equipment',
      '\t\t}',
      '\t}',
      '}',
      '',
    ),
    entityName: 'test_tech',
    label: 'technology',
    relativePath: 'common/technologies/test_air.txt',
  },
  {
    content: l(
      'version="1.0.0"',
      'tags={',
      '\t"Gameplay"',
      '\t"Balance"',
      '}',
      'name="Test Mod"',
      'supported_version="1.14.*"',
      '',
    ),
    entityName: 'tags',
    label: 'mod descriptor',
    relativePath: 'descriptor.mod',
  },
];

const MOD_ID = 'scratch-mod';

describe('entity-mutation.service — Electron-free write (ADR 027 decision 6)', () => {
  let scratchRoot: string;

  const configWith = (
    permission: ProjectedSource['permission'],
  ): EntityMutationConfig => ({
    dialects: [],
    sources: [{ path: scratchRoot, permission }],
    workspace: {
      includedMods: [
        {
          id: MOD_ID,
          name: 'scratch',
          path: scratchRoot,
          permission: 'editable',
        },
      ],
    },
  });

  const mirror = async (fixture: EntityFixture): Promise<string> => {
    const target = path.join(scratchRoot, fixture.relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, fixture.content);
    return target;
  };

  beforeEach(async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), 'zmt-write-free-'));
    // Resolve symlinks up front (e.g. macOS /var -> /private/var) so the injected
    // source path and the real target the guard resolves compare equal.
    scratchRoot = await fs.realpath(base);
  });

  afterEach(async () => {
    await fs.rm(scratchRoot, { force: true, recursive: true });
  });

  it('writes each of the seven baseline entities byte-identically under an unmodified write', async () => {
    const config = configWith('editable');
    for (const fixture of FIXTURES) {
      const target = await mirror(fixture);
      await entityMutationService.write(
        {
          deltas: [{ added: [], block: null, changed: [], removed: [] }],
          entityName: fixture.entityName,
          modId: MOD_ID,
          relativePath: fixture.relativePath,
        },
        config,
      );
      const written = await fs.readFile(target, 'utf8');
      expect(written, `${fixture.label} must round-trip byte-identically`).toBe(
        fixture.content,
      );
    }
  });

  it('applies a real scalar edit through the real filesystem, changing only the edited bytes', async () => {
    const fixture = FIXTURES.find((f) => f.label === 'technology');
    if (fixture === undefined) throw new Error('technology fixture missing');
    const target = await mirror(fixture);

    await entityMutationService.write(
      {
        deltas: [
          {
            added: [],
            block: null,
            changed: [{ key: 'research_cost', value: '4' }],
            removed: [],
          },
        ],
        entityName: fixture.entityName,
        modId: MOD_ID,
        relativePath: fixture.relativePath,
      },
      configWith('editable'),
    );

    const written = await fs.readFile(target, 'utf8');
    expect(written).toBe(
      fixture.content.replace('research_cost = 2', 'research_cost = 4'),
    );
  });

  it('rejects a write under a readonly injected source with FORBIDDEN (path guard unchanged)', async () => {
    const fixture = FIXTURES[0];
    await mirror(fixture);
    await expect(
      entityMutationService.write(
        {
          deltas: [{ added: [], block: null, changed: [], removed: [] }],
          entityName: fixture.entityName,
          modId: MOD_ID,
          relativePath: fixture.relativePath,
        },
        configWith('readonly'),
      ),
    ).rejects.toMatchObject({ code: IPC_ERROR_CODES.FORBIDDEN });
  });
});
