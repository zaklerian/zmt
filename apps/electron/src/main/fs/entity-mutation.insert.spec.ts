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

// ZMT-51 regression gates 4 and 5 — the MAIN-SIDE half of the ADD loop, driven
// against a real scratch mirror through the real path guard, both format
// strategies, the parser, and `node:fs`. Nothing is mocked except the one induced
// phase-2 rename failure the rollback gate requires. Pure Node, no Electron binary
// (ADR 027 decision 6).
//
// The operations here are the SHAPE the add form emits — asserted on the renderer
// side in `libs/r-game-hoi4/src/technology/technology-add.util.spec.ts` and
// `…/technology-form-descriptor.add.spec.ts`. The two halves meet at this wire
// contract, which is what makes the add loop end-to-end in-session.

const l = (...lines: readonly string[]): string => lines.join('\n');

const TECH_FILE = l(
  'technologies = {',
  '\tair_superiority = {',
  '\t\tresearch_cost = 2',
  '\t\tstart_year = 1936',
  '\t\tfolder = {',
  '\t\t\tname = air_techs_folder',
  '\t\t\tposition = { x = 5 y = 4 }',
  '\t\t}',
  '\t}',
  '}',
  '',
);

// The SAME technology, hand-authored in place — the byte-identity target of gate
// 5. Written out literally, not derived from the insert, so the gate compares the
// tool's output against a human's file rather than against itself.
const HAND_AUTHORED = l(
  'technologies = {',
  '\tair_superiority = {',
  '\t\tresearch_cost = 2',
  '\t\tstart_year = 1936',
  '\t\tfolder = {',
  '\t\t\tname = air_techs_folder',
  '\t\t\tposition = { x = 5 y = 4 }',
  '\t\t}',
  '\t}',
  '\tinterceptor4 = {',
  '\t\tstart_year = 1940',
  '\t\tpath = {',
  '\t\t\tleads_to_tech = air_superiority',
  '\t\t}',
  '\t\tfolder = {',
  '\t\t\tname = air_techs_folder',
  '\t\t\tposition = { x = 5 y = 6 }',
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
    ' air_superiority:0 "Air Superiority"',
    ' UNRELATED_KEY:1 "Untouched"',
    '',
  );

const TECH_PATH = 'common/technologies/air_doctrine.txt';
const LOC_PATH = 'localisation/english/research_l_english.yml';

// The add form's script half: an INSERT under `technologies`, its body an
// all-added delta set — root scalars at `block: null`, each new object-list item
// at its own indexed segment.
const insertOperation = (name: string) =>
  ({
    deltas: [
      {
        added: [{ key: 'start_year', value: '1940' }],
        block: null,
        changed: [],
        removed: [],
      },
      {
        added: [{ key: 'leads_to_tech', value: 'air_superiority' }],
        block: [{ index: 0, name: 'path' }],
        changed: [],
        removed: [],
      },
      {
        added: [
          { key: 'name', value: 'air_techs_folder' },
          { key: 'position', value: '{ x = 5 y = 6 }' },
        ],
        block: [{ index: 0, name: 'folder' }],
        changed: [],
        removed: [],
      },
    ],
    entityName: name,
    format: 'script',
    insertUnder: 'technologies',
    modId: 'bice',
    relativePath: TECH_PATH,
  }) as const;

const locInsertOperation = (key: string) =>
  ({
    deltas: [{ key, kind: 'insert', value: 'Interceptor IV', version: '0' }],
    format: 'loc',
    modId: 'bice',
    relativePath: LOC_PATH,
  }) as const;

describe('entityMutationService.writeBatch — the technology add loop (ZMT-51)', () => {
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
    const base = await fs.mkdtemp(path.join(os.tmpdir(), 'zmt-tech-add-'));
    scratchRoot = await fs.realpath(base);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(scratchRoot, { force: true, recursive: true });
  });

  it('inserts the technology block and its loc name key in one batch (gate 4)', async () => {
    const techFile = await mirror(TECH_PATH, TECH_FILE);
    const locFile = await mirror(LOC_PATH, LOC_FILE);

    await run({
      operations: [
        insertOperation('interceptor4'),
        locInsertOperation('interceptor4'),
      ],
    });

    expect(await fs.readFile(techFile, 'utf8')).toBe(HAND_AUTHORED);
    expect(await fs.readFile(locFile, 'utf8')).toBe(
      BOM +
        l(
          'l_english:',
          ' air_superiority:0 "Air Superiority"',
          ' UNRELATED_KEY:1 "Untouched"',
          ' interceptor4:0 "Interceptor IV"',
          '',
        ),
    );
  });

  it('writes the inserted block byte-identically to the hand-authored one (gate 5)', async () => {
    const techFile = await mirror(TECH_PATH, TECH_FILE);

    await run({ operations: [insertOperation('interceptor4')] });

    // Indentation, brace placement, and the trailing newline all match a block a
    // human would have typed into the same file — the ZMT-47 insert guarantee,
    // asserted here through the shape the Add form emits.
    expect(await fs.readFile(techFile, 'utf8')).toBe(HAND_AUTHORED);
  });

  it('leaves BOTH files at their originals on an induced mid-batch failure (gate 4)', async () => {
    const techFile = await mirror(TECH_PATH, TECH_FILE);
    const locFile = await mirror(LOC_PATH, LOC_FILE);

    // The one fault content or path state cannot provoke: a phase-2 rename error
    // on the loc file, AFTER the technology file has already committed.
    const actualRename = fs.rename.bind(fs);
    vi.spyOn(fs, 'rename').mockImplementation(async (oldPath, newPath) => {
      if (oldPath === locFile) {
        throw Object.assign(new Error('induced phase-2 failure'), {
          code: 'EIO',
        });
      }
      return actualRename(oldPath as string, newPath as string);
    });

    await expect(
      run({
        operations: [
          insertOperation('interceptor4'),
          locInsertOperation('interceptor4'),
        ],
      }),
    ).rejects.toMatchObject({ code: IPC_ERROR_CODES.INTERNAL });

    expect(await fs.readFile(techFile, 'utf8')).toBe(TECH_FILE);
    expect(await fs.readFile(locFile, 'utf8')).toBe(LOC_FILE);
  });

  it('refuses to shadow an existing sibling and touches no file', async () => {
    const techFile = await mirror(TECH_PATH, TECH_FILE);
    const locFile = await mirror(LOC_PATH, LOC_FILE);

    await expect(
      run({
        operations: [
          insertOperation('air_superiority'),
          locInsertOperation('air_superiority'),
        ],
      }),
    ).rejects.toMatchObject({ code: IPC_ERROR_CODES.CONFLICT });

    expect(await fs.readFile(techFile, 'utf8')).toBe(TECH_FILE);
    expect(await fs.readFile(locFile, 'utf8')).toBe(LOC_FILE);
  });
});
