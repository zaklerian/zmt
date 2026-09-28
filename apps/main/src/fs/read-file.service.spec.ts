import { MAX_PAYLOAD_BYTES } from '@zmt/contracts';
import { promises as fs, type Stats } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { IpcFailure } from '../ipc/ipc-failure.model';
import { toSafePath } from './path-guard.util';
import { readTextFile } from './read-file.service';
import { type SafePath } from './safe-path.model';

describe('readTextFile', () => {
  let root = '';

  async function safe(target: string): Promise<SafePath> {
    return toSafePath(root, target);
  }

  beforeEach(async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'zmt-read-')));
    await fs.writeFile(path.join(root, 'a.txt'), 'héllo wörld');
    await fs.mkdir(path.join(root, 'dir'));
  });

  afterEach(async () => {
    await fs.rm(root, { force: true, recursive: true });
  });

  it('reads utf8 text', async () => {
    await expect(readTextFile(await safe(path.join(root, 'a.txt')))).resolves.toBe('héllo wörld');
  });

  it('fails with 404 for a missing file', async () => {
    const promise = readTextFile(await safe(path.join(root, 'missing.txt')));
    await expect(promise).rejects.toBeInstanceOf(IpcFailure);
    await expect(promise).rejects.toMatchObject({ code: 404 });
  });

  it('fails with 404 when a path segment is a file', async () => {
    await expect(readTextFile(await safe(path.join(root, 'a.txt', 'x')))).rejects.toMatchObject({
      code: 404,
    });
  });

  it('fails with 400 for a directory', async () => {
    await expect(readTextFile(await safe(path.join(root, 'dir')))).rejects.toMatchObject({
      code: 400,
    });
  });

  it('fails with 413 when the file exceeds the payload limit', async () => {
    const real = await fs.stat(path.join(root, 'a.txt'));
    const oversized: Stats = Object.assign(Object.create(real) as Stats, {
      size: MAX_PAYLOAD_BYTES + 1,
    });
    const spy = vi.spyOn(fs, 'stat').mockResolvedValueOnce(oversized);
    try {
      await expect(readTextFile(await safe(path.join(root, 'a.txt')))).rejects.toMatchObject({
        code: 413,
      });
    } finally {
      spy.mockRestore();
    }
  });

  it('accepts a file exactly at the payload limit', async () => {
    const real = await fs.stat(path.join(root, 'a.txt'));
    const atLimit: Stats = Object.assign(Object.create(real) as Stats, { size: MAX_PAYLOAD_BYTES });
    const spy = vi.spyOn(fs, 'stat').mockResolvedValueOnce(atLimit);
    try {
      await expect(readTextFile(await safe(path.join(root, 'a.txt')))).resolves.toBe('héllo wörld');
    } finally {
      spy.mockRestore();
    }
  });

  it('fails with 500 on a stat error other than ENOENT', async () => {
    const spy = vi
      .spyOn(fs, 'stat')
      .mockRejectedValueOnce(Object.assign(new Error('denied'), { code: 'EACCES' }));
    try {
      await expect(readTextFile(await safe(path.join(root, 'a.txt')))).rejects.toMatchObject({
        code: 500,
      });
    } finally {
      spy.mockRestore();
    }
  });

  it('fails with 500 when reading fails after stat', async () => {
    const spy = vi.spyOn(fs, 'readFile').mockRejectedValueOnce(new Error('io'));
    try {
      await expect(readTextFile(await safe(path.join(root, 'a.txt')))).rejects.toMatchObject({
        code: 500,
      });
    } finally {
      spy.mockRestore();
    }
  });
});
