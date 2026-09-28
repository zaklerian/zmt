import { IPC_ERROR_CODES } from '@zmt/contracts';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { IpcFailure } from '../ipc/ipc-failure.model';
import {
  isContained,
  normalizeForComparison,
  resolveRealPath,
  resolveRoot,
  toSafePath,
} from './path-guard.util';

async function makeTree(): Promise<{ readonly base: string; readonly root: string }> {
  const base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'zmt-guard-')));
  const root = path.join(base, 'root');
  await fs.mkdir(path.join(root, 'sub'), { recursive: true });
  await fs.mkdir(path.join(base, 'outside'));
  await fs.writeFile(path.join(root, 'inside.txt'), 'inside');
  await fs.writeFile(path.join(base, 'outside', 'secret.txt'), 'secret');
  return { base, root };
}

async function expectFailure(promise: Promise<unknown>, code: number): Promise<void> {
  await expect(promise).rejects.toBeInstanceOf(IpcFailure);
  await expect(promise).rejects.toMatchObject({ code });
}

describe('toSafePath', () => {
  let base = '';
  let root = '';

  beforeEach(async () => {
    ({ base, root } = await makeTree());
  });

  afterEach(async () => {
    await fs.rm(base, { force: true, recursive: true });
  });

  it('mints the resolved path of a file under the root', async () => {
    await expect(toSafePath(root, path.join(root, 'inside.txt'))).resolves.toBe(
      path.join(root, 'inside.txt'),
    );
  });

  it('accepts the root itself', async () => {
    await expect(toSafePath(root, root)).resolves.toBe(root);
    await expect(toSafePath(`${root}${path.sep}`, root)).resolves.toBe(root);
  });

  it('accepts a not-yet-existing file whose parent exists', async () => {
    await expect(toSafePath(root, path.join(root, 'sub', 'new.txt'))).resolves.toBe(
      path.join(root, 'sub', 'new.txt'),
    );
  });

  it('accepts a not-yet-existing nested path and keeps the tail', async () => {
    await expect(toSafePath(root, path.join(root, 'a', 'b', 'c.txt'))).resolves.toBe(
      path.join(root, 'a', 'b', 'c.txt'),
    );
  });

  it('rejects a relative path that resolves outside the root', async () => {
    await expectFailure(toSafePath(root, path.join(root, '..', 'outside', 'secret.txt')), 403);
  });

  it('rejects an absolute path outside the root', async () => {
    await expectFailure(toSafePath(root, path.join(base, 'outside', 'secret.txt')), 403);
    await expectFailure(toSafePath(root, os.tmpdir()), 403);
  });

  it('rejects a sibling directory whose name starts with the root name', async () => {
    await fs.mkdir(`${root}-sibling`);
    await expectFailure(toSafePath(root, `${root}-sibling`), 403);
  });

  it('rejects a symlinked file pointing outside the root', async () => {
    const link = path.join(root, 'escape.txt');
    await fs.symlink(path.join(base, 'outside', 'secret.txt'), link);
    await expectFailure(toSafePath(root, link), 403);
  });

  it('rejects a symlinked directory pointing outside the root, existing or new tail', async () => {
    const link = path.join(root, 'escape-dir');
    await fs.symlink(path.join(base, 'outside'), link);
    await expectFailure(toSafePath(root, path.join(link, 'secret.txt')), 403);
    await expectFailure(toSafePath(root, path.join(link, 'new.txt')), 403);
  });

  it('accepts a symlink that stays inside the root and mints its target', async () => {
    const link = path.join(root, 'alias.txt');
    await fs.symlink(path.join(root, 'inside.txt'), link);
    await expect(toSafePath(root, link)).resolves.toBe(path.join(root, 'inside.txt'));
  });

  it('resolves a symlinked root to its real location', async () => {
    const rootLink = path.join(base, 'root-link');
    await fs.symlink(root, rootLink);
    await expect(toSafePath(rootLink, path.join(rootLink, 'inside.txt'))).resolves.toBe(
      path.join(root, 'inside.txt'),
    );
  });

  it('rejects a path with a NUL byte', async () => {
    await expectFailure(toSafePath(root, `${root}/a\0b`), 400);
  });

  it('rejects when the root does not exist', async () => {
    await expectFailure(toSafePath(path.join(base, 'missing'), path.join(base, 'x')), 403);
  });

  it('rejects a missing tail that climbs with ..', async () => {
    await expectFailure(toSafePath(root, path.join(root, 'missing', '..', '..', 'x')), 403);
  });

  it('honours an explicit win32 platform for case-insensitive containment', async () => {
    await expect(
      toSafePath(root, path.join(root, 'inside.txt'), { platform: 'posix' }),
    ).resolves.toBe(path.join(root, 'inside.txt'));
  });
});

describe('resolveRealPath', () => {
  it('re-attaches the missing tail to the nearest existing ancestor', async () => {
    const base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'zmt-real-')));
    try {
      await expect(resolveRealPath(path.join(base, 'a', 'b', 'c'))).resolves.toBe(
        path.join(base, 'a', 'b', 'c'),
      );
    } finally {
      await fs.rm(base, { force: true, recursive: true });
    }
  });

  it('rejects when no ancestor exists, including the filesystem root', async () => {
    const spy = vi
      .spyOn(fs, 'realpath')
      .mockRejectedValue(Object.assign(new Error('missing'), { code: 'ENOENT' }));
    try {
      await expectFailure(resolveRealPath(path.join(path.sep, 'a', 'b')), 403);
      expect(spy).toHaveBeenCalledTimes(3);
    } finally {
      spy.mockRestore();
    }
  });

  it('maps a non-ENOENT error to an internal failure', async () => {
    const spy = vi
      .spyOn(fs, 'realpath')
      .mockRejectedValueOnce(Object.assign(new Error('denied'), { code: 'EACCES' }));
    try {
      await expectFailure(resolveRealPath('/tmp'), 500);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('resolveRoot', () => {
  it('rejects a missing root with 403', async () => {
    await expectFailure(
      resolveRoot(path.join(os.tmpdir(), `zmt-missing-${String(Date.now())}`)),
      403,
    );
  });
});

describe('isContained', () => {
  it('compares posix paths case-sensitively', () => {
    expect(isContained('/root/a', '/root', 'posix')).toBe(true);
    expect(isContained('/root', '/root', 'posix')).toBe(true);
    expect(isContained('/root', '/root/', 'posix')).toBe(true);
    expect(isContained('/Root/a', '/root', 'posix')).toBe(false);
    expect(isContained('/root-2/a', '/root', 'posix')).toBe(false);
    expect(isContained('/other/root/a', '/root', 'posix')).toBe(false);
  });

  it('compares win32 paths case-insensitively with normalized separators', () => {
    expect(isContained('C:\\Mods\\A\\b.txt', 'c:\\mods', 'win32')).toBe(true);
    expect(isContained('C:/Mods/A/b.txt', 'C:\\Mods\\', 'win32')).toBe(true);
    expect(isContained('C:\\Mods', 'C:\\Mods', 'win32')).toBe(true);
    expect(isContained('C:\\Mods2\\a', 'C:\\Mods', 'win32')).toBe(false);
    expect(isContained('D:\\Mods\\a', 'C:\\Mods', 'win32')).toBe(false);
    expect(isContained('C:\\Mods\\..\\Other\\a', 'C:\\Mods', 'win32')).toBe(false);
  });

  it('normalizes Unicode to NFC before comparing', () => {
    const decomposed = 'Mode\u0301';
    const composed = 'Mod\u00e9';
    expect(isContained(`/root/${decomposed}/a`, `/root/${composed}`, 'posix')).toBe(true);
    expect(isContained(`C:\\${decomposed}\\a`, `c:\\${composed}`, 'win32')).toBe(true);
  });
});

describe('normalizeForComparison', () => {
  it('lower-cases only on win32', () => {
    expect(normalizeForComparison('/Root/A', 'posix')).toBe('/Root/A');
    expect(normalizeForComparison('C:/Root/A', 'win32')).toBe('c:\\root\\a');
  });
});

describe('IPC_ERROR_CODES usage', () => {
  it('uses the shared forbidden code', () => {
    expect(IPC_ERROR_CODES.forbidden).toBe(403);
  });
});
