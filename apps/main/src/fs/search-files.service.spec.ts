import { FILE_SUPPORT } from '@zmt/contracts';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { toSafePath } from './path-guard.util';
import { type SafePath } from './safe-path.model';
import {
  matchesQuery,
  normalizeQuery,
  SEARCH_MAX_DEPTH,
  SEARCH_RESULT_LIMIT,
  searchFiles,
} from './search-files.service';

const OPTIONS = { hideUnsupportedFiles: false } as const;

describe('searchFiles', () => {
  let root = '';

  async function safe(target: string): Promise<SafePath> {
    return toSafePath(root, target);
  }

  beforeEach(async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'zmt-search-')));
    await fs.mkdir(path.join(root, 'common', 'units'), { recursive: true });
    await fs.writeFile(path.join(root, 'common', 'units', 'Infantry.txt'), '');
    await fs.writeFile(path.join(root, 'common', 'tanks.yml'), '');
    await fs.writeFile(path.join(root, 'infantry.dds'), '');
    await fs.writeFile(path.join(root, 'notes.md'), '');
    await fs.writeFile(path.join(root, '.infantry-hidden.txt'), '');
    await fs.mkdir(path.join(root, '.git'));
    await fs.writeFile(path.join(root, '.git', 'infantry.txt'), '');
    await fs.symlink(path.join(root, 'notes.md'), path.join(root, 'infantry-link.md'));
  });

  afterEach(async () => {
    await fs.rm(root, { force: true, recursive: true });
  });

  it('matches file names case-insensitively across nested directories', async () => {
    const results = await searchFiles(await safe(root), 'INFANTRY', OPTIONS);
    expect(results.map((node) => node.path)).toEqual([
      path.join(root, 'common', 'units', 'Infantry.txt'),
      path.join(root, 'infantry.dds'),
    ]);
    expect(results[0]).toMatchObject({
      extension: '.txt',
      hasChildren: false,
      name: 'Infantry.txt',
      support: FILE_SUPPORT.editable,
      type: 'file',
    });
  });

  it('skips dotfiles, dot directories and symlinks', async () => {
    const results = await searchFiles(await safe(root), 'infantry', OPTIONS);
    expect(results.map((node) => node.name)).not.toContain('.infantry-hidden.txt');
    expect(results.map((node) => node.name)).not.toContain('infantry-link.md');
    expect(results.some((node) => node.path.includes('.git'))).toBe(false);
  });

  it('returns nothing for an empty or whitespace query', async () => {
    await expect(searchFiles(await safe(root), '', OPTIONS)).resolves.toEqual([]);
    await expect(searchFiles(await safe(root), '   ', OPTIONS)).resolves.toEqual([]);
  });

  it('trims the query', async () => {
    const results = await searchFiles(await safe(root), '  tanks  ', OPTIONS);
    expect(results.map((node) => node.name)).toEqual(['tanks.yml']);
  });

  it('hides unsupported files on request', async () => {
    const results = await searchFiles(await safe(root), 'infantry', {
      hideUnsupportedFiles: true,
    });
    expect(results.map((node) => node.name)).toEqual(['Infantry.txt']);
  });

  it('caps the result count', async () => {
    const many = path.join(root, 'many');
    await fs.mkdir(many);
    await Promise.all(
      Array.from({ length: SEARCH_RESULT_LIMIT + 5 }, async (_value, index) =>
        fs.writeFile(path.join(many, `hit-${String(index).padStart(3, '0')}.txt`), ''),
      ),
    );
    const results = await searchFiles(await safe(root), 'hit-', OPTIONS);
    expect(results).toHaveLength(SEARCH_RESULT_LIMIT);
  });

  it('does not descend past the depth limit', async () => {
    const segments = Array.from({ length: SEARCH_MAX_DEPTH + 1 }, (_value, index) => String(index));
    const deep = path.join(root, ...segments);
    await fs.mkdir(deep, { recursive: true });
    await fs.writeFile(path.join(deep, 'too-deep.txt'), '');
    const shallow = path.join(root, ...segments.slice(0, SEARCH_MAX_DEPTH));
    await fs.writeFile(path.join(shallow, 'in-range.txt'), '');
    const results = await searchFiles(await safe(root), '.txt', OPTIONS);
    expect(results.map((node) => node.name)).toContain('in-range.txt');
    expect(results.map((node) => node.name)).not.toContain('too-deep.txt');
  });

  it('skips a directory that cannot be read', async () => {
    const spy = vi.spyOn(fs, 'readdir').mockRejectedValueOnce(new Error('denied'));
    try {
      await expect(searchFiles(await safe(root), 'infantry', OPTIONS)).resolves.toEqual([]);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('normalizeQuery and matchesQuery', () => {
  it('lower-cases and trims', () => {
    expect(normalizeQuery('  TaNk ')).toBe('tank');
    expect(matchesQuery('Tanks.yml', 'tank')).toBe(true);
    expect(matchesQuery('planes.yml', 'tank')).toBe(false);
  });
});
