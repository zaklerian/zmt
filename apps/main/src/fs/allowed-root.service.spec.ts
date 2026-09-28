import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { IpcFailure } from '../ipc/ipc-failure.model';
import { createAllowedRoot } from './allowed-root.service';

describe('createAllowedRoot', () => {
  let root = '';

  beforeEach(async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'zmt-root-')));
  });

  afterEach(async () => {
    await fs.rm(root, { force: true, recursive: true });
  });

  it('starts without a root unless one is given', () => {
    expect(createAllowedRoot().get()).toBeNull();
    expect(createAllowedRoot('/mods').get()).toBe('/mods');
  });

  it('refuses to guard a path while no root is open', async () => {
    const promise = createAllowedRoot().guard(path.join(root, 'a.txt'));
    await expect(promise).rejects.toBeInstanceOf(IpcFailure);
    await expect(promise).rejects.toMatchObject({ code: 403, message: 'No root folder is open' });
  });

  it('guards against the current root after set and clear', async () => {
    const allowedRoot = createAllowedRoot();
    allowedRoot.set(root);
    await expect(allowedRoot.guard(path.join(root, 'a.txt'))).resolves.toBe(
      path.join(root, 'a.txt'),
    );
    await expect(allowedRoot.guard(os.tmpdir())).rejects.toMatchObject({ code: 403 });
    allowedRoot.clear();
    expect(allowedRoot.get()).toBeNull();
    await expect(allowedRoot.guard(path.join(root, 'a.txt'))).rejects.toMatchObject({
      code: 403,
    });
  });

  it('passes guard options through', async () => {
    const allowedRoot = createAllowedRoot(root);
    await expect(allowedRoot.guard(path.join(root, 'a.txt'), { platform: 'posix' })).resolves.toBe(
      path.join(root, 'a.txt'),
    );
  });

  it('is frozen', () => {
    expect(Object.isFrozen(createAllowedRoot())).toBe(true);
  });
});
