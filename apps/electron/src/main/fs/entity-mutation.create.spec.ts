import {
  EntityBatchWriteRequest,
  IPC_ERROR_CODES,
  Workspace,
} from '@contracts';
import { parse } from '@paradox-parser';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EntityMutationConfig } from './entity-mutation.service';

import { entityMutationService } from './entity-mutation.service';

// ZMT-56 regression gates 2–7 — the `create` batch operation kind and its UNLINK
// rollback (ADR 027 decision 3 as amended; ADR 029 decision 6), driven against a
// real scratch mirror through the real path guard, both format strategies, the
// parser, and `node:fs`. Nothing is mocked except the one induced phase-2 rename
// failure the rollback gates require — a fault that cannot be provoked from
// content or path state. Pure Node, no Electron binary (gate 7).

const l = (...lines: readonly string[]): string => lines.join('\n');

const BOM = '﻿';

// The exact bytes a real BICE loc file opens with: UTF-8 BOM `ef bb bf`, then
// `l_english:` and a terminator. Verified against
// `test-mod-bice/localisation/english/` — all 190 files carry the BOM, 170 of them
// open with exactly this header (`docs/grounding/ZMT-48-loc-format-grounding.md`).
const SEEDED_LOC = BOM + 'l_english:\n';

// The minimum a created technology `.txt` needs: not a format requirement — an
// empty file parses clean — but the PARENT BLOCK the AST insert addresses.
const SEEDED_TECH = l('technologies = {', '}', '');

const EXISTING_TECH_FILE = l(
  'technologies = {',
  '\tair_superiority = {',
  '\t\tresearch_cost = 2',
  '\t}',
  '}',
  '',
);

const NEW_TECH_PATH = 'common/technologies/ZMT_new_air.txt';
const NEW_LOC_PATH = 'localisation/english/ZMT_new_l_english.yml';
const EXISTING_TECH_PATH = 'common/technologies/air_doctrine.txt';

const createLocOperation = (relativePath: string) =>
  ({
    format: 'locCreate',
    language: 'english',
    modId: 'bice',
    relativePath,
  }) as const;

const createScriptOperation = (relativePath: string) =>
  ({
    format: 'scriptCreate',
    modId: 'bice',
    relativePath,
    rootBlocks: ['technologies'],
  }) as const;

const locInsertOperation = (relativePath: string, key: string) =>
  ({
    deltas: [{ key, kind: 'insert', value: 'Interceptor IV', version: '0' }],
    format: 'loc',
    modId: 'bice',
    relativePath,
  }) as const;

// The add form's script half against a brand-new file: an INSERT under the
// `technologies` block the create seeded.
const scriptInsertOperation = (relativePath: string, name: string) =>
  ({
    deltas: [
      {
        added: [{ key: 'start_year', value: '1940' }],
        block: null,
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
    relativePath,
  }) as const;

describe('entityMutationService.writeBatch — the `create` operation kind (ZMT-56)', () => {
  let scratchRoot: string;

  const absolute = (relativePath: string): string =>
    path.join(scratchRoot, relativePath);

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

  const exists = async (relativePath: string): Promise<boolean> => {
    try {
      await fs.stat(absolute(relativePath));
      return true;
    } catch {
      return false;
    }
  };

  const mirror = async (
    relativePath: string,
    content: string,
  ): Promise<string> => {
    const target = absolute(relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content);
    return target;
  };

  const run = (request: EntityBatchWriteRequest): Promise<void> =>
    entityMutationService.writeBatch(request, config());

  beforeEach(async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), 'zmt-create-'));
    scratchRoot = await fs.realpath(base);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(scratchRoot, { force: true, recursive: true });
  });

  it('seeds a created loc file with the exact BICE BOM + header bytes (gate 2)', async () => {
    await run({ operations: [createLocOperation(NEW_LOC_PATH)] });

    const bytes = await fs.readFile(absolute(NEW_LOC_PATH));
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(bytes.toString('utf8')).toBe(SEEDED_LOC);
  });

  it('adds the first key to a loc file created in the same batch (gate 2)', async () => {
    await run({
      operations: [
        createLocOperation(NEW_LOC_PATH),
        locInsertOperation(NEW_LOC_PATH, 'interceptor4'),
      ],
    });

    expect(await fs.readFile(absolute(NEW_LOC_PATH), 'utf8')).toBe(
      BOM + l('l_english:', ' interceptor4:0 "Interceptor IV"', ''),
    );
  });

  it('seeds a created .txt with a parseable file (gate 3)', async () => {
    await run({ operations: [createScriptOperation(NEW_TECH_PATH)] });

    const bytes = await fs.readFile(absolute(NEW_TECH_PATH), 'utf8');
    expect(bytes).toBe(SEEDED_TECH);
    expect(parse(bytes, { dialects: [] }).errors).toEqual([]);
  });

  it('adds the first block to a .txt created in the same batch (gate 3)', async () => {
    await run({
      operations: [
        createScriptOperation(NEW_TECH_PATH),
        scriptInsertOperation(NEW_TECH_PATH, 'interceptor4'),
      ],
    });

    expect(await fs.readFile(absolute(NEW_TECH_PATH), 'utf8')).toBe(
      l(
        'technologies = {',
        '\tinterceptor4 = {',
        '\t\tstart_year = 1940',
        '\t\tfolder = {',
        '\t\t\tname = air_techs_folder',
        '\t\t\tposition = { x = 5 y = 6 }',
        '\t\t}',
        '\t}',
        '}',
        '',
      ),
    );
  });

  it('commits create + first-write on one new file as an ordered sequence, not a same-file rejection (gate 6)', async () => {
    // The pairing `assertOneOperationPerFile` used to reject outright. It is legal
    // now precisely because it is NOT two stagings: the insert applies to the seed
    // in memory, so neither operation reads the file from disk.
    await expect(
      run({
        operations: [
          createScriptOperation(NEW_TECH_PATH),
          scriptInsertOperation(NEW_TECH_PATH, 'interceptor4'),
        ],
      }),
    ).resolves.toBeUndefined();

    const bytes = await fs.readFile(absolute(NEW_TECH_PATH), 'utf8');
    expect(bytes.startsWith('technologies = {\n\tinterceptor4 = {')).toBe(true);
    expect(parse(bytes, { dialects: [] }).errors).toEqual([]);
  });

  it('still rejects two CONTENT operations on the same file (gate 6, the invariant that stands)', async () => {
    await mirror(EXISTING_TECH_PATH, EXISTING_TECH_FILE);

    await expect(
      run({
        operations: [
          locInsertOperation(EXISTING_TECH_PATH, 'a'),
          locInsertOperation(EXISTING_TECH_PATH, 'b'),
        ],
      }),
    ).rejects.toMatchObject({ code: IPC_ERROR_CODES.BAD_REQUEST });
  });

  it('leaves no file when a phase-1 failure follows the create (gate 4)', async () => {
    await expect(
      run({
        operations: [
          createScriptOperation(NEW_TECH_PATH),
          scriptInsertOperation(NEW_TECH_PATH, 'interceptor4'),
          // A content operation on a file that is not there and was not created:
          // phase 1 turns its ENOENT into NOT_FOUND and aborts the batch.
          locInsertOperation('localisation/english/absent_l_english.yml', 'x'),
        ],
      }),
    ).rejects.toMatchObject({ code: IPC_ERROR_CODES.NOT_FOUND });

    expect(await exists(NEW_TECH_PATH)).toBe(false);
    expect(await fs.readdir(path.dirname(absolute(NEW_TECH_PATH)))).toEqual([]);
  });

  it('unlinks the created file when a phase-2 rename fails on a later operation (gate 4)', async () => {
    const existing = await mirror(EXISTING_TECH_PATH, EXISTING_TECH_FILE);

    // Induce the phase-2 failure on the SECOND file, after the created file has
    // already been renamed into place. Its rollback verb is unlink, not restore.
    const actualRename = fs.rename.bind(fs);
    const rename = vi
      .spyOn(fs, 'rename')
      .mockImplementation(async (oldPath, newPath) => {
        if (oldPath === existing) {
          throw Object.assign(new Error('induced phase-2 failure'), {
            code: 'EIO',
          });
        }
        return actualRename(oldPath as string, newPath as string);
      });

    await expect(
      run({
        operations: [
          createScriptOperation(NEW_TECH_PATH),
          scriptInsertOperation(NEW_TECH_PATH, 'interceptor4'),
          {
            entityNames: ['air_superiority'],
            format: 'scriptDelete',
            modId: 'bice',
            relativePath: EXISTING_TECH_PATH,
          },
        ],
      }),
    ).rejects.toMatchObject({ code: IPC_ERROR_CODES.INTERNAL });

    // The created file was COMMITTED (its temp was renamed onto the target) and
    // then removed — not merely never written. That is the unlink branch, and
    // asserting only on absence would pass even if phase 1 had aborted.
    expect(
      rename.mock.calls.some(([, to]) => to === absolute(NEW_TECH_PATH)),
    ).toBe(true);
    expect(await exists(NEW_TECH_PATH)).toBe(false);
    expect(await fs.readFile(existing, 'utf8')).toBe(EXISTING_TECH_FILE);
  });

  it('unlinks the new file and restores the existing one on a mixed-batch failure (gate 5)', async () => {
    const existing = await mirror(EXISTING_TECH_PATH, EXISTING_TECH_FILE);

    // File 2 is committed (backed up, then overwritten) before file 3's induced
    // failure, so the rollback must exercise BOTH branches in one pass: unlink the
    // created file 1, restore the pre-existing file 2.
    const decoy = await mirror(
      'common/technologies/decoy.txt',
      'root = {\n}\n',
    );
    const actualRename = fs.rename.bind(fs);
    const rename = vi
      .spyOn(fs, 'rename')
      .mockImplementation(async (oldPath, newPath) => {
        if (oldPath === decoy) {
          throw Object.assign(new Error('induced phase-2 failure'), {
            code: 'EIO',
          });
        }
        return actualRename(oldPath as string, newPath as string);
      });

    await expect(
      run({
        operations: [
          createLocOperation(NEW_LOC_PATH),
          locInsertOperation(NEW_LOC_PATH, 'interceptor4'),
          scriptInsertOperation(EXISTING_TECH_PATH, 'interceptor4'),
          {
            entityNames: ['root'],
            format: 'scriptDelete',
            modId: 'bice',
            relativePath: 'common/technologies/decoy.txt',
          },
        ],
      }),
    ).rejects.toMatchObject({ code: IPC_ERROR_CODES.INTERNAL });

    expect(
      rename.mock.calls.some(([, to]) => to === absolute(NEW_LOC_PATH)),
    ).toBe(true);
    expect(await exists(NEW_LOC_PATH)).toBe(false);
    expect(await fs.readFile(existing, 'utf8')).toBe(EXISTING_TECH_FILE);
    expect(await fs.readFile(decoy, 'utf8')).toBe('root = {\n}\n');
  });

  it('patches — and restores, never unlinks — a create target that already exists', async () => {
    // create-if-absent (ADR 029 decision 6). A stale target that reappeared is an
    // ordinary edit: the seed is not written over it, and a failed batch leaves the
    // user's file, not a hole where it used to be.
    const target = await mirror(
      NEW_LOC_PATH,
      BOM + l('l_english:', ' KEPT:0 "Kept"', ''),
    );
    const decoy = await mirror(
      'common/technologies/decoy.txt',
      'root = {\n}\n',
    );
    const actualRename = fs.rename.bind(fs);
    vi.spyOn(fs, 'rename').mockImplementation(async (oldPath, newPath) => {
      if (oldPath === decoy) {
        throw Object.assign(new Error('induced phase-2 failure'), {
          code: 'EIO',
        });
      }
      return actualRename(oldPath as string, newPath as string);
    });

    await expect(
      run({
        operations: [
          createLocOperation(NEW_LOC_PATH),
          locInsertOperation(NEW_LOC_PATH, 'interceptor4'),
          {
            entityNames: ['root'],
            format: 'scriptDelete',
            modId: 'bice',
            relativePath: 'common/technologies/decoy.txt',
          },
        ],
      }),
    ).rejects.toMatchObject({ code: IPC_ERROR_CODES.INTERNAL });

    expect(await fs.readFile(target, 'utf8')).toBe(
      BOM + l('l_english:', ' KEPT:0 "Kept"', ''),
    );
  });

  it('rejects a create whose target lies outside an editable source', async () => {
    await expect(
      run({
        operations: [createScriptOperation('../escaped/evil.txt')],
      }),
    ).rejects.toMatchObject({ code: IPC_ERROR_CODES.FORBIDDEN });
  });
});
