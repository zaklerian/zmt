import { MAX_PAYLOAD_BYTES } from '@zmt/contracts';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { IpcFailure } from '../ipc/ipc-failure.model';
import { toSafePath } from './path-guard.util';
import { type SafePath } from './safe-path.model';
import {
  assertNotDirectory,
  assertParentDirectory,
  tempPathFor,
  writeTextFile,
} from './write-file.service';

describe('write-file service', () => {
  let root = '';

  async function safe(target: string): Promise<SafePath> {
    return toSafePath(root, target);
  }

  async function names(): Promise<readonly string[]> {
    return fs.readdir(root);
  }

  beforeEach(async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'zmt-write-')));
    await fs.mkdir(path.join(root, 'dir'));
    await fs.writeFile(path.join(root, 'existing.txt'), 'old');
  });

  afterEach(async () => {
    await fs.rm(root, { force: true, recursive: true });
  });

  it('writes text and leaves no temp file behind', async () => {
    await writeTextFile(await safe(path.join(root, 'new.txt')), 'héllo');
    await expect(fs.readFile(path.join(root, 'new.txt'), 'utf8')).resolves.toBe('héllo');
    expect(await names()).toEqual(['dir', 'existing.txt', 'new.txt']);
  });

  it('replaces an existing file atomically', async () => {
    await writeTextFile(await safe(path.join(root, 'existing.txt')), 'new');
    await expect(fs.readFile(path.join(root, 'existing.txt'), 'utf8')).resolves.toBe('new');
    expect(await names()).toEqual(['dir', 'existing.txt']);
  });

  it('accepts an empty payload', async () => {
    await writeTextFile(await safe(path.join(root, 'empty.txt')), '');
    await expect(fs.readFile(path.join(root, 'empty.txt'), 'utf8')).resolves.toBe('');
  });

  it('fails with 413 when the payload exceeds the limit, measuring utf8 bytes', async () => {
    const promise = writeTextFile(
      await safe(path.join(root, 'big.txt')),
      'é'.repeat(MAX_PAYLOAD_BYTES / 2 + 1),
    );
    await expect(promise).rejects.toBeInstanceOf(IpcFailure);
    await expect(promise).rejects.toMatchObject({ code: 413 });
    expect(await names()).toEqual(['dir', 'existing.txt']);
  });

  it('fails with 404 when the parent directory is missing', async () => {
    await expect(
      writeTextFile(await safe(path.join(root, 'missing', 'a.txt')), 'x'),
    ).rejects.toMatchObject({ code: 404 });
  });

  it('fails with 404 when the parent is a file', async () => {
    await expect(
      writeTextFile(await safe(path.join(root, 'existing.txt', 'a.txt')), 'x'),
    ).rejects.toMatchObject({ code: 404 });
  });

  it('fails with 400 when the target is a directory', async () => {
    await expect(writeTextFile(await safe(path.join(root, 'dir')), 'x')).rejects.toMatchObject({
      code: 400,
    });
  });

  it('fails with 500 and removes the temp file when the rename fails', async () => {
    const spy = vi.spyOn(fs, 'rename').mockRejectedValueOnce(new Error('busy'));
    try {
      await expect(
        writeTextFile(await safe(path.join(root, 'new.txt')), 'x'),
      ).rejects.toMatchObject({ code: 500 });
    } finally {
      spy.mockRestore();
    }
    expect(await names()).toEqual(['dir', 'existing.txt']);
  });

  it('fails with 500 when the parent cannot be stated', async () => {
    const spy = vi
      .spyOn(fs, 'stat')
      .mockRejectedValueOnce(Object.assign(new Error('denied'), { code: 'EACCES' }));
    try {
      await expect(
        assertParentDirectory(await safe(path.join(root, 'a.txt'))),
      ).rejects.toMatchObject({ code: 500 });
    } finally {
      spy.mockRestore();
    }
  });

  it('fails with 500 when the target cannot be stated', async () => {
    const spy = vi
      .spyOn(fs, 'lstat')
      .mockRejectedValueOnce(Object.assign(new Error('denied'), { code: 'EACCES' }));
    try {
      await expect(assertNotDirectory(await safe(path.join(root, 'a.txt')))).rejects.toMatchObject({
        code: 500,
      });
    } finally {
      spy.mockRestore();
    }
  });

  it('passes for a missing target and an existing file', async () => {
    await expect(
      assertNotDirectory(await safe(path.join(root, 'nope.txt'))),
    ).resolves.toBeUndefined();
    await expect(
      assertNotDirectory(await safe(path.join(root, 'existing.txt'))),
    ).resolves.toBeUndefined();
  });

  it('builds a hidden sibling temp path', () => {
    const temp = tempPathFor('/root/dir/file.txt');
    expect(path.dirname(temp)).toBe('/root/dir');
    expect(path.basename(temp)).toMatch(/^\.file\.txt\.[0-9a-f]{16}\.tmp$/u);
    expect(tempPathFor('/root/dir/file.txt')).not.toBe(temp);
  });
});
