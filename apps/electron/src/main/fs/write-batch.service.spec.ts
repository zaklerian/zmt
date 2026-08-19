import { IPC_ERROR_CODES, ProjectedSource } from '@contracts';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WriteBatchConfig, WriteOperation } from './write-batch.service';

import { applyWriteBatch } from './write-batch.service';

// ADR 027 decision 3 / regression gates 3–5, 7. The cross-file two-phase atomic
// batch is driven against a REAL scratch mirror through the REAL path guard,
// strategy, and `node:fs` — nothing is mocked except the ONE induced phase-2 rename
// failure the rollback gate requires (a fault that cannot be provoked from content
// or path state). Pure Node, no Electron binary (decision 6).

const l = (...lines: readonly string[]): string => lines.join('\n');

// A minimal Clausewitz technology file: one `test_tech` block under a
// `technologies` parent, the shape the move-entity batch (gate 3) edits.
const TECH_FILE = l(
  'technologies = {',
  '\ttest_tech = {',
  '\t\tresearch_cost = 2',
  '\t}',
  '}',
  '',
);

// A real-shape BOM'd BICE localisation file, for the cross-format batch gates.
const BOM = '﻿';
const LOC_FILE = BOM + l('l_english:', ' EXISTING_TECH:0 "Existing Tech"', '');

const leftoverDotFiles = async (dir: string): Promise<readonly string[]> => {
  const entries = await fs.readdir(dir);
  return entries.filter(
    (name) => name.endsWith('.tmp') || name.endsWith('.bak'),
  );
};

describe('write-batch.service — cross-file two-phase atomic batch (ADR 027 decision 3)', () => {
  let scratchRoot: string;

  const config = (): WriteBatchConfig => ({
    dialects: [],
    sources: [{ path: scratchRoot, permission: 'editable' }],
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

  const patchOp = (
    absolutePath: string,
    key: string,
    value: string,
  ): WriteOperation => ({
    absolutePath,
    deltas: [
      {
        deltas: [
          { added: [], block: null, changed: [{ key, value }], removed: [] },
        ],
        entityName: 'test_tech',
        kind: 'patch',
      },
    ],
    format: 'ast',
  });

  beforeEach(async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), 'zmt-batch-'));
    // Resolve symlinks up front (e.g. macOS /var -> /private/var) so the injected
    // source path and the real target the guard resolves compare equal.
    scratchRoot = await fs.realpath(base);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(scratchRoot, { force: true, recursive: true });
  });

  it('applies a single-op patch byte-identically to the ADR 019 output (gate 2)', async () => {
    const target = await mirror('a.txt', TECH_FILE);

    await applyWriteBatch([patchOp(target, 'research_cost', '9')], config());

    expect(await fs.readFile(target, 'utf8')).toBe(
      TECH_FILE.replace('research_cost = 2', 'research_cost = 9'),
    );
    expect(await leftoverDotFiles(scratchRoot)).toEqual([]);
  });

  it('applies a 2-file batch — insert in one file + delete in another — atomically (gate 3)', async () => {
    const fileA = await mirror('a.txt', TECH_FILE);
    const fileB = await mirror(
      'b.txt',
      l(
        'technologies = {',
        '\texisting = {',
        '\t\tresearch_cost = 1',
        '\t}',
        '}',
        '',
      ),
    );

    await applyWriteBatch(
      [
        {
          absolutePath: fileA,
          deltas: [{ entityName: 'test_tech', kind: 'delete' }],
          format: 'ast',
        },
        {
          absolutePath: fileB,
          deltas: [
            {
              body: [
                {
                  added: [{ key: 'research_cost', value: '2' }],
                  block: null,
                  changed: [],
                  removed: [],
                },
              ],
              kind: 'insert',
              name: 'moved_tech',
              parentName: 'technologies',
            },
          ],
          format: 'ast',
        },
      ],
      config(),
    );

    expect(await fs.readFile(fileA, 'utf8')).toBe(
      l('technologies = {', '}', ''),
    );
    expect(await fs.readFile(fileB, 'utf8')).toBe(
      l(
        'technologies = {',
        '\texisting = {',
        '\t\tresearch_cost = 1',
        '\t}',
        '\tmoved_tech = {',
        '\t\tresearch_cost = 2',
        '\t}',
        '}',
        '',
      ),
    );
    expect(await leftoverDotFiles(scratchRoot)).toEqual([]);
  });

  it('rolls every file back from backups when a phase-2 rename fails on file 2 of 3 (gate 4)', async () => {
    const file1 = await mirror('1.txt', TECH_FILE);
    const file2 = await mirror('2.txt', TECH_FILE);
    const file3 = await mirror('3.txt', TECH_FILE);

    // Induce a phase-2 failure on file 2: reject the back-up rename (original ->
    // backup) whose source is file 2's target. This is the one fault the rollback
    // gate cannot provoke from content/path state. Every other rename — including
    // the rollback restore of file 1 — runs for real.
    const actualRename = fs.rename.bind(fs);
    vi.spyOn(fs, 'rename').mockImplementation(async (oldPath, newPath) => {
      if (oldPath === file2) {
        throw Object.assign(new Error('induced phase-2 failure'), {
          code: 'EIO',
        });
      }
      return actualRename(oldPath as string, newPath as string);
    });

    await expect(
      applyWriteBatch(
        [
          patchOp(file1, 'research_cost', '11'),
          patchOp(file2, 'research_cost', '22'),
          patchOp(file3, 'research_cost', '33'),
        ],
        config(),
      ),
    ).rejects.toMatchObject({ code: IPC_ERROR_CODES.INTERNAL });

    // File 1 was committed then rolled back; file 2's original never moved; file 3
    // was never reached. All three hold their original bytes.
    expect(await fs.readFile(file1, 'utf8')).toBe(TECH_FILE);
    expect(await fs.readFile(file2, 'utf8')).toBe(TECH_FILE);
    expect(await fs.readFile(file3, 'utf8')).toBe(TECH_FILE);
    expect(await leftoverDotFiles(scratchRoot)).toEqual([]);
  });

  it('restores a half-committed file (backup already taken) when the commit rename fails (gate 4)', async () => {
    const file1 = await mirror('1.txt', TECH_FILE);
    const file2 = await mirror('2.txt', TECH_FILE);
    const file3 = await mirror('3.txt', TECH_FILE);

    // Induce the OTHER phase-2 failure mode: file 2's original is already renamed
    // to its backup (step A), then its commit rename (temp -> target, step B)
    // fails. This must trigger the inner-catch restore of file 2 from its backup,
    // then the outer rollback of the committed file 1.
    const actualRename = fs.rename.bind(fs);
    vi.spyOn(fs, 'rename').mockImplementation(async (oldPath, newPath) => {
      if (newPath === file2 && String(oldPath).endsWith('.tmp')) {
        throw Object.assign(new Error('induced commit failure'), {
          code: 'EIO',
        });
      }
      return actualRename(oldPath as string, newPath as string);
    });

    await expect(
      applyWriteBatch(
        [
          patchOp(file1, 'research_cost', '11'),
          patchOp(file2, 'research_cost', '22'),
          patchOp(file3, 'research_cost', '33'),
        ],
        config(),
      ),
    ).rejects.toMatchObject({ code: IPC_ERROR_CODES.INTERNAL });

    expect(await fs.readFile(file1, 'utf8')).toBe(TECH_FILE);
    expect(await fs.readFile(file2, 'utf8')).toBe(TECH_FILE);
    expect(await fs.readFile(file3, 'utf8')).toBe(TECH_FILE);
    expect(await leftoverDotFiles(scratchRoot)).toEqual([]);
  });

  it('leaves the tree completely untouched when phase 1 aborts on a stale-edit conflict (gate 5)', async () => {
    const file1 = await mirror('1.txt', TECH_FILE);
    const file2 = await mirror('2.txt', TECH_FILE);

    await expect(
      applyWriteBatch(
        [
          patchOp(file1, 'research_cost', '9'),
          // A change against a field that does not exist is a phase-1 (pre-rename)
          // validation failure — nothing may be renamed.
          patchOp(file2, 'does_not_exist', '1'),
        ],
        config(),
      ),
    ).rejects.toMatchObject({ code: IPC_ERROR_CODES.CONFLICT });

    expect(await fs.readFile(file1, 'utf8')).toBe(TECH_FILE);
    expect(await fs.readFile(file2, 'utf8')).toBe(TECH_FILE);
    expect(await leftoverDotFiles(scratchRoot)).toEqual([]);
  });

  it('rejects the whole batch when any operation targets a readonly source (gate 7)', async () => {
    const editableDir = path.join(scratchRoot, 'editable');
    const readonlyDir = path.join(scratchRoot, 'readonly');
    await fs.mkdir(editableDir, { recursive: true });
    await fs.mkdir(readonlyDir, { recursive: true });
    const editableFile = path.join(editableDir, 'a.txt');
    const readonlyFile = path.join(readonlyDir, 'b.txt');
    await fs.writeFile(editableFile, TECH_FILE);
    await fs.writeFile(readonlyFile, TECH_FILE);

    const mixedSources: readonly ProjectedSource[] = [
      { path: editableDir, permission: 'editable' },
      { path: readonlyDir, permission: 'readonly' },
    ];

    await expect(
      applyWriteBatch(
        [
          patchOp(editableFile, 'research_cost', '9'),
          patchOp(readonlyFile, 'research_cost', '9'),
        ],
        { dialects: [], sources: mixedSources },
      ),
    ).rejects.toMatchObject({ code: IPC_ERROR_CODES.FORBIDDEN });

    // The readonly op aborts the whole batch in phase 1; the editable file is left
    // untouched and no temp survives.
    expect(await fs.readFile(editableFile, 'utf8')).toBe(TECH_FILE);
    expect(await fs.readFile(readonlyFile, 'utf8')).toBe(TECH_FILE);
    expect(await leftoverDotFiles(editableDir)).toEqual([]);
    expect(await leftoverDotFiles(readonlyDir)).toEqual([]);
  });

  it('applies a cross-format batch — AST insert in .txt + loc insert in .yml — atomically (ADR 027 gate: add-a-technology-with-its-name)', async () => {
    const techFile = await mirror('common/technologies/air.txt', TECH_FILE);
    const locFile = await mirror('localisation/english/air.yml', LOC_FILE);

    await applyWriteBatch(
      [
        {
          absolutePath: techFile,
          deltas: [
            {
              body: [
                {
                  added: [{ key: 'research_cost', value: '3' }],
                  block: null,
                  changed: [],
                  removed: [],
                },
              ],
              kind: 'insert',
              name: 'new_fighter',
              parentName: 'technologies',
            },
          ],
          format: 'ast',
        },
        {
          absolutePath: locFile,
          deltas: [
            {
              key: 'new_fighter',
              kind: 'insert',
              value: 'New Fighter',
              version: '0',
            },
          ],
          format: 'loc',
        },
      ],
      config(),
    );

    expect(await fs.readFile(techFile, 'utf8')).toBe(
      l(
        'technologies = {',
        '\ttest_tech = {',
        '\t\tresearch_cost = 2',
        '\t}',
        '\tnew_fighter = {',
        '\t\tresearch_cost = 3',
        '\t}',
        '}',
        '',
      ),
    );
    expect(await fs.readFile(locFile, 'utf8')).toBe(
      `${LOC_FILE} new_fighter:0 "New Fighter"\n`,
    );
    expect(await leftoverDotFiles(path.dirname(techFile))).toEqual([]);
    expect(await leftoverDotFiles(path.dirname(locFile))).toEqual([]);
  });

  it('rolls a mixed .txt + .yml batch back to both originals on an induced phase-2 failure (ADR 027 gate: cross-format rollback)', async () => {
    const techFile = await mirror('a.txt', TECH_FILE);
    const locFile = await mirror('b.yml', LOC_FILE);

    // Induce a phase-2 failure on the loc file: reject its back-up rename. The AST
    // file commits first, then must roll back from its backup when the loc rename
    // fails — proving the rollback composes across BOTH format strategies.
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
      applyWriteBatch(
        [
          patchOp(techFile, 'research_cost', '9'),
          {
            absolutePath: locFile,
            deltas: [{ key: 'EXISTING_TECH', kind: 'set', value: 'Changed' }],
            format: 'loc',
          },
        ],
        config(),
      ),
    ).rejects.toMatchObject({ code: IPC_ERROR_CODES.INTERNAL });

    expect(await fs.readFile(techFile, 'utf8')).toBe(TECH_FILE);
    expect(await fs.readFile(locFile, 'utf8')).toBe(LOC_FILE);
    expect(await leftoverDotFiles(scratchRoot)).toEqual([]);
  });
});
