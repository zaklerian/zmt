import { FILE_SUPPORT } from '@zmt/contracts';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { IpcFailure } from '../ipc/ipc-failure.model';
import { compareNodes, directoryHasChildren, listDirectory } from './list-directory.service';
import { toSafePath } from './path-guard.util';
import { type SafePath } from './safe-path.model';

const OPTIONS = { hideUnsupportedFiles: false } as const;

describe('listDirectory', () => {
  let root = '';

  async function safe(target: string): Promise<SafePath> {
    return toSafePath(root, target);
  }

  beforeEach(async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'zmt-list-')));
    await fs.mkdir(path.join(root, 'zeta'));
    await fs.mkdir(path.join(root, 'Alpha', 'nested'), { recursive: true });
    await fs.writeFile(path.join(root, 'Alpha', 'nested', 'deep.txt'), 'deep');
    await fs.mkdir(path.join(root, 'empty'));
    await fs.mkdir(path.join(root, 'only-dotfiles'));
    await fs.writeFile(path.join(root, 'only-dotfiles', '.hidden'), '');
    await fs.writeFile(path.join(root, 'b.txt'), 'b');
    await fs.writeFile(path.join(root, 'A.MOD'), 'a');
    await fs.writeFile(path.join(root, 'image.png'), 'png');
    await fs.writeFile(path.join(root, 'blob.dds'), 'dds');
    await fs.writeFile(path.join(root, 'README'), 'readme');
    await fs.writeFile(path.join(root, '.hidden'), 'hidden');
    await fs.symlink(path.join(root, 'b.txt'), path.join(root, 'link.txt'));
  });

  afterEach(async () => {
    await fs.rm(root, { force: true, recursive: true });
  });

  it('lists directories first, then files, case-insensitively sorted', async () => {
    const nodes = await listDirectory(await safe(root), OPTIONS);
    expect(nodes.map((node) => node.name)).toEqual([
      'Alpha',
      'empty',
      'only-dotfiles',
      'zeta',
      'A.MOD',
      'b.txt',
      'blob.dds',
      'image.png',
      'README',
    ]);
  });

  it('skips dotfiles and symlinks', async () => {
    const names = (await listDirectory(await safe(root), OPTIONS)).map((node) => node.name);
    expect(names).not.toContain('.hidden');
    expect(names).not.toContain('link.txt');
  });

  it('reports one level lazily: hasChildren without listing grandchildren', async () => {
    const nodes = await listDirectory(await safe(root), OPTIONS);
    const byName = new Map(nodes.map((node) => [node.name, node]));
    expect(byName.get('Alpha')).toMatchObject({
      extension: null,
      hasChildren: true,
      path: path.join(root, 'Alpha'),
      support: FILE_SUPPORT.readonly,
      type: 'directory',
    });
    expect(byName.get('empty')?.hasChildren).toBe(false);
    expect(byName.get('only-dotfiles')?.hasChildren).toBe(false);
    expect(nodes.some((node) => node.name === 'deep.txt')).toBe(false);
  });

  it('classifies files by lower-cased extension', async () => {
    const nodes = await listDirectory(await safe(root), OPTIONS);
    const byName = new Map(nodes.map((node) => [node.name, node]));
    expect(byName.get('A.MOD')).toMatchObject({
      extension: '.mod',
      hasChildren: false,
      support: FILE_SUPPORT.editable,
      type: 'file',
    });
    expect(byName.get('image.png')?.support).toBe(FILE_SUPPORT.readonly);
    expect(byName.get('blob.dds')?.support).toBe(FILE_SUPPORT.unsupported);
    expect(byName.get('README')).toMatchObject({
      extension: null,
      support: FILE_SUPPORT.unsupported,
    });
  });

  it('hides unsupported files on request but keeps directories', async () => {
    const nodes = await listDirectory(await safe(root), { hideUnsupportedFiles: true });
    expect(nodes.map((node) => node.name)).toEqual([
      'Alpha',
      'empty',
      'only-dotfiles',
      'zeta',
      'A.MOD',
      'b.txt',
      'image.png',
    ]);
  });

  it('fails with 404 for a missing directory', async () => {
    const promise = listDirectory(await safe(path.join(root, 'missing')), OPTIONS);
    await expect(promise).rejects.toBeInstanceOf(IpcFailure);
    await expect(promise).rejects.toMatchObject({ code: 404 });
  });

  it('fails with 400 when the path is a file', async () => {
    await expect(
      listDirectory(await safe(path.join(root, 'b.txt')), OPTIONS),
    ).rejects.toMatchObject({
      code: 400,
    });
  });

  it('fails with 500 on other read errors', async () => {
    const spy = vi
      .spyOn(fs, 'readdir')
      .mockRejectedValueOnce(Object.assign(new Error('denied'), { code: 'EACCES' }));
    try {
      await expect(listDirectory(await safe(root), OPTIONS)).rejects.toMatchObject({ code: 500 });
    } finally {
      spy.mockRestore();
    }
  });
});

describe('directoryHasChildren', () => {
  it('returns false when the directory cannot be read', async () => {
    await expect(directoryHasChildren(path.join(os.tmpdir(), 'zmt-nope-xyz'))).resolves.toBe(false);
  });
});

describe('compareNodes', () => {
  const base = { extension: null, hasChildren: false, path: '/x', support: 'readonly' } as const;

  it('orders directories before files and names case-insensitively', () => {
    const dir = { ...base, name: 'z', type: 'directory' } as const;
    const file = { ...base, name: 'a', type: 'file' } as const;
    expect(compareNodes(dir, file)).toBeLessThan(0);
    expect(compareNodes(file, dir)).toBeGreaterThan(0);
    expect(compareNodes({ ...file, name: 'B' }, { ...file, name: 'a' })).toBeGreaterThan(0);
    expect(compareNodes({ ...file, name: 'a' }, { ...file, name: 'A' })).toBe(0);
  });
});
