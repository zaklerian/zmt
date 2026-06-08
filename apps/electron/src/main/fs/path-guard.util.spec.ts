import { IPC_ERROR_CODES } from '@contracts';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { assertPathUnderRoot } from './path-guard.util';
import { rootStateService } from './root-state.service';

describe('assertPathUnderRoot', () => {
  let root: string;
  let outside: string;

  beforeEach(async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), 'zmt-path-guard-'));
    // Resolve up front so assertions compare against the symlink-followed
    // location (e.g. macOS /var -> /private/var).
    const realBase = await fs.realpath(base);
    root = path.join(realBase, 'root');
    outside = path.join(realBase, 'outside');
    await fs.mkdir(root);
    await fs.mkdir(outside);
    rootStateService.set(root);
  });

  afterEach(async () => {
    const realBase = path.dirname(root);
    rootStateService.set(null);
    await fs.rm(realBase, { force: true, recursive: true });
  });

  it('passes for a target inside the root', async () => {
    const target = path.join(root, 'file.txt');
    await fs.writeFile(target, 'hello');
    await expect(assertPathUnderRoot(target)).resolves.toBeUndefined();
  });

  it('rejects FORBIDDEN for a target outside the root', async () => {
    const target = path.join(outside, 'file.txt');
    await fs.writeFile(target, 'hello');
    await expect(assertPathUnderRoot(target)).rejects.toMatchObject({
      code: IPC_ERROR_CODES.FORBIDDEN,
    });
  });

  it('rejects FORBIDDEN for a symlink under the root pointing outside it', async () => {
    const escapeTarget = path.join(outside, 'secret.txt');
    await fs.writeFile(escapeTarget, 'secret');
    const link = path.join(root, 'escape.txt');
    await fs.symlink(escapeTarget, link);
    await expect(assertPathUnderRoot(link)).rejects.toMatchObject({
      code: IPC_ERROR_CODES.FORBIDDEN,
    });
  });

  it('passes for a not-yet-existing file directly under the root', async () => {
    const target = path.join(root, 'new-file.txt');
    await expect(assertPathUnderRoot(target)).resolves.toBeUndefined();
  });
});
