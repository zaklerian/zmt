import {
  EntityBatchWriteRequest,
  IPC_ERROR_CODES,
  Workspace,
} from '@contracts';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EntityMutationConfig } from './entity-mutation.service';

import { entityMutationService } from './entity-mutation.service';

// ZMT-52 regression gates 1, 4, 5 and 6 — the MAIN-SIDE half of the delete loop,
// driven against a REAL scratch mirror through the REAL path guard, both format
// strategies, the parser, and `node:fs`. NOTHING is mocked except the one induced
// phase-2 rename failure the rollback gate requires. Pure Node, no Electron
// binary (ADR 027 decision 6).
//
// The fixtures carry BICE's real shape (grounded this ticket): a
// `common/technologies/*.txt` roots every technology in ONE `technologies = { … }`
// block, declares `@`-var coordinate constants above them, and holds MANY
// technologies per file — all 35 base `air_techs_folder` technologies live in
// `air_techs.txt`, which is exactly why same-file multi-delete (gate 5) is the
// common case and not an edge one. A folder's technologies can also span files
// (`tank_techs_folder` spans 12), which is gate 4.

const l = (...lines: readonly string[]): string => lines.join('\n');

const AIR_FILE = l(
  '# GENERIC PLANE ARCHETYPES',
  '',
  'technologies = {',
  '\t@1936 = 4',
  '\t@FTR = 3',
  '',
  '\tearly_fighter = {',
  '\t\tpath = {',
  '\t\t\tleads_to_tech = fighter2',
  '\t\t\tresearch_cost_coeff = 1',
  '\t\t}',
  '\t\tresearch_cost = 1',
  '\t\tstart_year = 1936',
  '\t\tfolder = {',
  '\t\t\tname = air_techs_folder',
  '\t\t\tposition = { x = @FTR y = @1936 }',
  '\t\t}',
  '\t}',
  '\tfighter2 = {',
  '\t\tresearch_cost = 2',
  '\t\tstart_year = 1940',
  '\t\tfolder = {',
  '\t\t\tname = air_techs_folder',
  '\t\t\tposition = { x = @FTR y = 6 }',
  '\t\t}',
  '\t}',
  '\tinterceptor1 = {',
  '\t\tresearch_cost = 3',
  '\t\tfolder = {',
  '\t\t\tname = air_techs_folder',
  '\t\t\tposition = { x = 7 y = 4 }',
  '\t\t}',
  '\t}',
  '}',
  '',
);

const ENGINE_FILE = l(
  'technologies = {',
  '\t@JET_ENG = 12',
  '',
  '\ttech_air_engine_jet = {',
  '\t\tresearch_cost = 2.0',
  '\t\tstart_year = 1945',
  '\t\tfolder = {',
  '\t\t\tname = air_techs_folder',
  '\t\t\tposition = { x = @JET_ENG y = 14 }',
  '\t\t}',
  '\t}',
  '}',
  '',
);

const BOM = '﻿';
const LOC_FILE =
  BOM +
  l(
    'l_english:',
    ' early_fighter:0 "Early Fighter"',
    ' early_fighter_desc:0 "The first monoplane fighters."',
    ' fighter2:0 "Fighter II"',
    ' UNRELATED_KEY:1 "Untouched"',
    '',
  );

const AIR_PATH = 'common/technologies/air_techs.txt';
const ENGINE_PATH = 'common/technologies/electronic_mechanical_engineering.txt';
const LOC_PATH = 'localisation/english/research_l_english.yml';

describe('entityMutationService.writeBatch — the technology delete loop (ZMT-52)', () => {
  let scratchRoot: string;

  const config = (): EntityMutationConfig => ({
    dialects: [],
    sources: [{ path: scratchRoot, permission: 'editable' }],
    workspace: {
      includedMods: [
        {
          id: 'bice',
          name: 'BICE',
          path: scratchRoot,
          permission: 'editable',
        },
      ],
    } satisfies Workspace,
  });

  const mirror = async (
    relativePath: string,
    content: string,
  ): Promise<string> => {
    const target = path.join(scratchRoot, relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content);
    return target;
  };

  const run = (request: EntityBatchWriteRequest): Promise<void> =>
    entityMutationService.writeBatch(request, config());

  beforeEach(async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), 'zmt-tech-delete-'));
    scratchRoot = await fs.realpath(base);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(scratchRoot, { force: true, recursive: true });
  });

  // Gate 1 — delete item.
  it('removes a leaf technology block and its loc keys as one atomic batch (gate 1)', async () => {
    const techFile = await mirror(AIR_PATH, AIR_FILE);
    const locFile = await mirror(LOC_PATH, LOC_FILE);

    await run({
      operations: [
        {
          entityNames: ['fighter2'],
          format: 'scriptDelete',
          modId: 'bice',
          relativePath: AIR_PATH,
        },
        {
          deltas: [{ key: 'fighter2', kind: 'delete' }],
          format: 'loc',
          modId: 'bice',
          relativePath: LOC_PATH,
        },
      ],
    });

    const script = await fs.readFile(techFile, 'utf8');
    expect(script).not.toContain('fighter2 = {');
    expect(script).toContain('early_fighter = {');
    expect(script).toContain('interceptor1 = {');
    expect(await fs.readFile(locFile, 'utf8')).toBe(
      LOC_FILE.replace(' fighter2:0 "Fighter II"\n', ''),
    );
  });

  // Gate 6 — the surrounding file is untouched outside the removed block: the
  // `@`-var header, the leading comment, the sibling blocks, their indentation and
  // the trailing newline all survive byte-for-byte. A reflow of untouched blocks
  // would be a diff the user never asked for.
  it('leaves the file byte-identical except the removed block (gate 6)', async () => {
    const techFile = await mirror(AIR_PATH, AIR_FILE);

    await run({
      operations: [
        {
          entityNames: ['fighter2'],
          format: 'scriptDelete',
          modId: 'bice',
          relativePath: AIR_PATH,
        },
      ],
    });

    const removed = l(
      '\tfighter2 = {',
      '\t\tresearch_cost = 2',
      '\t\tstart_year = 1940',
      '\t\tfolder = {',
      '\t\t\tname = air_techs_folder',
      '\t\t\tposition = { x = @FTR y = 6 }',
      '\t\t}',
      '\t}',
      '',
    );
    expect(await fs.readFile(techFile, 'utf8')).toBe(
      AIR_FILE.replace(removed, ''),
    );
  });

  // Gate 5 — the constraint ZMT-50/51 flagged, which delete-tree hits directly.
  it('composes 2+ deletes in ONE file as an ordered per-file delta list (gate 5)', async () => {
    const techFile = await mirror(AIR_PATH, AIR_FILE);

    await run({
      operations: [
        {
          entityNames: ['early_fighter', 'fighter2'],
          format: 'scriptDelete',
          modId: 'bice',
          relativePath: AIR_PATH,
        },
      ],
    });

    const script = await fs.readFile(techFile, 'utf8');
    expect(script).not.toContain('early_fighter = {');
    expect(script).not.toContain('fighter2 = {');
    // Everything else — the header comment, the `@`-vars, the surviving block —
    // is exactly as authored.
    expect(script).toContain('# GENERIC PLANE ARCHETYPES');
    expect(script).toContain('\t@FTR = 3');
    expect(script).toContain('\tinterceptor1 = {');
  });

  it('rejects two operations naming the same file, which is why the list exists (gate 5)', async () => {
    await mirror(AIR_PATH, AIR_FILE);

    await expect(
      run({
        operations: [
          {
            entityNames: ['early_fighter'],
            format: 'scriptDelete',
            modId: 'bice',
            relativePath: AIR_PATH,
          },
          {
            entityNames: ['fighter2'],
            format: 'scriptDelete',
            modId: 'bice',
            relativePath: AIR_PATH,
          },
        ],
      }),
    ).rejects.toMatchObject({ code: IPC_ERROR_CODES.BAD_REQUEST });
  });

  // Gate 4 — a delete-tree spanning two `.txt` files and their `.yml`.
  it('commits a delete-tree spanning 2 .txt files and a .yml atomically (gate 4)', async () => {
    const airFile = await mirror(AIR_PATH, AIR_FILE);
    const engineFile = await mirror(ENGINE_PATH, ENGINE_FILE);
    const locFile = await mirror(LOC_PATH, LOC_FILE);

    await run({ operations: treeOperations() });

    const air = await fs.readFile(airFile, 'utf8');
    expect(air).not.toContain('early_fighter = {');
    expect(air).not.toContain('fighter2 = {');
    expect(air).toContain('interceptor1 = {');
    expect(await fs.readFile(engineFile, 'utf8')).toBe(
      ENGINE_FILE.replace(
        l(
          '\ttech_air_engine_jet = {',
          '\t\tresearch_cost = 2.0',
          '\t\tstart_year = 1945',
          '\t\tfolder = {',
          '\t\t\tname = air_techs_folder',
          '\t\t\tposition = { x = @JET_ENG y = 14 }',
          '\t\t}',
          '\t}',
          '',
        ),
        '',
      ),
    );
    const loc = await fs.readFile(locFile, 'utf8');
    expect(loc).not.toContain('early_fighter');
    expect(loc).not.toContain('fighter2');
    expect(loc).toContain('UNRELATED_KEY');
  });

  it('rolls every file back to its original when a mid-batch rename fails (gate 4)', async () => {
    const airFile = await mirror(AIR_PATH, AIR_FILE);
    const engineFile = await mirror(ENGINE_PATH, ENGINE_FILE);
    const locFile = await mirror(LOC_PATH, LOC_FILE);

    // Induce the phase-2 failure the rollback exists for: the third commit
    // rename (temp -> target) throws after the first two already landed.
    const realRename = fs.rename.bind(fs);
    let commits = 0;
    vi.spyOn(fs, 'rename').mockImplementation(async (from, to) => {
      if (String(from).includes('.tmp')) {
        commits += 1;
        if (commits === 3) throw new Error('induced rename failure');
      }
      return realRename(from, to);
    });

    await expect(run({ operations: treeOperations() })).rejects.toMatchObject({
      code: IPC_ERROR_CODES.INTERNAL,
    });

    expect(await fs.readFile(airFile, 'utf8')).toBe(AIR_FILE);
    expect(await fs.readFile(engineFile, 'utf8')).toBe(ENGINE_FILE);
    expect(await fs.readFile(locFile, 'utf8')).toBe(LOC_FILE);
  });

  // The delete-tree batch used by both gate-4 tests: two script files, each with
  // its own ordered delete list, plus the one `.yml` holding every removed key.
  function treeOperations(): EntityBatchWriteRequest['operations'] {
    return [
      {
        entityNames: ['early_fighter', 'fighter2'],
        format: 'scriptDelete',
        modId: 'bice',
        relativePath: AIR_PATH,
      },
      {
        entityNames: ['tech_air_engine_jet'],
        format: 'scriptDelete',
        modId: 'bice',
        relativePath: ENGINE_PATH,
      },
      {
        deltas: [
          { key: 'early_fighter', kind: 'delete' },
          { key: 'early_fighter_desc', kind: 'delete' },
          { key: 'fighter2', kind: 'delete' },
        ],
        format: 'loc',
        modId: 'bice',
        relativePath: LOC_PATH,
      },
    ];
  }
});
