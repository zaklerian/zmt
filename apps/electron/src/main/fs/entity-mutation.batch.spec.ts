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

// ZMT-50 regression gates 2, 3 and 6 — the MAIN-SIDE half of the edit loop, driven
// against a REAL scratch mirror through the REAL path guard, both format
// strategies, the parser, and `node:fs`. NOTHING is mocked except the one induced
// phase-2 rename failure the rollback gate requires. Pure Node, no Electron binary
// (ADR 027 decision 6).
//
// The `EntityBatchWriteRequest` literals here are the SAME shape the technology
// form emits — asserted on the renderer side in
// `libs/r-game-hoi4/src/technology/technology-form-descriptor.spec.ts`. The two
// specs meet at this wire contract, which is what makes the loop end-to-end
// without an Electron binary between them.

const l = (...lines: readonly string[]): string => lines.join('\n');

// Real BICE shapes: a technology block as `air_doctrine.txt` writes it, and a
// BOM'd loc file as `research_l_english.yml` is (ZMT-48 grounding).
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
const BOM = '﻿';
const LOC_FILE =
  BOM +
  l(
    'l_english:',
    ' air_superiority:0 "Air Superiority"',
    ' air_superiority_desc:0 "Making it difficult for enemy bombers."',
    ' UNRELATED_KEY:1 "Untouched"',
    '',
  );

const TECH_PATH = 'common/technologies/air_doctrine.txt';
const LOC_PATH = 'localisation/english/research_l_english.yml';

// The script operation for a `research_cost` edit — byte-for-byte the delta the
// pre-ticket single-file `entity:write` carried.
const scriptOperation = (value: string) =>
  ({
    deltas: [
      {
        added: [],
        block: null,
        changed: [{ key: 'research_cost', value }],
        removed: [],
      },
    ],
    entityName: 'air_superiority',
    format: 'script',
    modId: 'bice',
    relativePath: TECH_PATH,
  }) as const;

describe('entityMutationService.writeBatch — the technology edit loop (ZMT-50)', () => {
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
    const base = await fs.mkdtemp(path.join(os.tmpdir(), 'zmt-tech-edit-'));
    scratchRoot = await fs.realpath(base);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(scratchRoot, { force: true, recursive: true });
  });

  it('changes the .txt and the .yml together on one save (gate 2)', async () => {
    const techFile = await mirror(TECH_PATH, TECH_FILE);
    const locFile = await mirror(LOC_PATH, LOC_FILE);

    await run({
      operations: [
        scriptOperation('9'),
        {
          deltas: [
            {
              key: 'air_superiority',
              kind: 'set',
              value: 'Air Dominance',
            },
          ],
          format: 'loc',
          modId: 'bice',
          relativePath: LOC_PATH,
        },
      ],
    });

    expect(await fs.readFile(techFile, 'utf8')).toBe(
      TECH_FILE.replace('research_cost = 2', 'research_cost = 9'),
    );
    expect(await fs.readFile(locFile, 'utf8')).toBe(
      LOC_FILE.replace('"Air Superiority"', '"Air Dominance"'),
    );
  });

  it('writes the .txt byte-identically to the pre-ticket single-file write (gate 3)', async () => {
    const viaBatch = await mirror(TECH_PATH, TECH_FILE);
    await run({ operations: [scriptOperation('9')] });
    const batchBytes = await fs.readFile(viaBatch, 'utf8');

    // Reset and perform the SAME edit through the untouched single-file path.
    await fs.writeFile(viaBatch, TECH_FILE);
    await entityMutationService.write(
      {
        deltas: [...scriptOperation('9').deltas],
        entityName: 'air_superiority',
        modId: 'bice',
        relativePath: TECH_PATH,
      },
      config(),
    );

    expect(batchBytes).toBe(await fs.readFile(viaBatch, 'utf8'));
  });

  // The `renameTo` PRIMITIVE, exercised through the full request path so it is
  // known-good when the deferred reference cascade (ledger L-011) claims it. It has
  // NO production caller: the technology edit form freezes the token (fix-pass gate
  // 1, specced in `technology-form-descriptor.spec.ts`). This is the primitive's
  // own test, not an edit-path behaviour.
  it('renames a block and moves its loc keys atomically — the dormant L-011 primitive (gate 4)', async () => {
    const techFile = await mirror(TECH_PATH, TECH_FILE);
    const locFile = await mirror(LOC_PATH, LOC_FILE);

    await run({
      operations: [
        {
          deltas: [],
          entityName: 'air_superiority',
          format: 'script',
          modId: 'bice',
          relativePath: TECH_PATH,
          renameTo: 'air_dominance',
        },
        {
          deltas: [
            { key: 'air_superiority', kind: 'delete' },
            {
              key: 'air_dominance',
              kind: 'insert',
              value: 'Air Dominance',
              version: '0',
            },
            { key: 'air_superiority_desc', kind: 'delete' },
            {
              key: 'air_dominance_desc',
              kind: 'insert',
              value: 'Making it difficult for enemy bombers.',
              version: '0',
            },
          ],
          format: 'loc',
          modId: 'bice',
          relativePath: LOC_PATH,
        },
      ],
    });

    expect(await fs.readFile(techFile, 'utf8')).toBe(
      TECH_FILE.replace('air_superiority = {', 'air_dominance = {'),
    );
    // The stale keys are gone, the new ones present, and every unrelated line —
    // BOM, header, the `:1` version, key order — survives verbatim.
    expect(await fs.readFile(locFile, 'utf8')).toBe(
      BOM +
        l(
          'l_english:',
          ' UNRELATED_KEY:1 "Untouched"',
          ' air_dominance:0 "Air Dominance"',
          ' air_dominance_desc:0 "Making it difficult for enemy bombers."',
          '',
        ),
    );
  });

  it('leaves BOTH files at their originals on an induced mid-batch failure (gate 6)', async () => {
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
          scriptOperation('9'),
          {
            deltas: [
              { key: 'air_superiority', kind: 'set', value: 'Air Dominance' },
            ],
            format: 'loc',
            modId: 'bice',
            relativePath: LOC_PATH,
          },
        ],
      }),
    ).rejects.toMatchObject({ code: IPC_ERROR_CODES.INTERNAL });

    expect(await fs.readFile(techFile, 'utf8')).toBe(TECH_FILE);
    expect(await fs.readFile(locFile, 'utf8')).toBe(LOC_FILE);
  });

  it('rejects a batch naming the same file twice rather than silently dropping an edit', async () => {
    await mirror(TECH_PATH, TECH_FILE);
    await mirror(LOC_PATH, LOC_FILE);

    await expect(
      run({
        operations: [
          {
            deltas: [{ key: 'air_superiority', kind: 'set', value: 'One' }],
            format: 'loc',
            modId: 'bice',
            relativePath: LOC_PATH,
          },
          {
            deltas: [{ key: 'UNRELATED_KEY', kind: 'set', value: 'Two' }],
            format: 'loc',
            modId: 'bice',
            relativePath: LOC_PATH,
          },
        ],
      }),
    ).rejects.toMatchObject({ code: IPC_ERROR_CODES.BAD_REQUEST });
  });

  it('rejects an empty batch', async () => {
    await expect(run({ operations: [] })).rejects.toMatchObject({
      code: IPC_ERROR_CODES.BAD_REQUEST,
    });
  });
});
