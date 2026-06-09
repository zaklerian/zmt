import { IPC_ERROR_CODES, Workspace } from '@contracts';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  activeGameFolderPath,
  activeGameId,
  workspaceStoreService,
} from '../workspace';
import { assertReadable, assertWritable } from './path-guard.util';

vi.mock('../workspace', async (importActual) => {
  const actual = await importActual<typeof import('../workspace')>();
  return {
    ...actual,
    activeGameFolderPath: vi.fn(),
    activeGameId: vi.fn(),
    workspaceStoreService: { get: vi.fn() },
  };
});

describe('path guard read/write split', () => {
  let vanilla: string;
  let mod: string;
  let outside: string;

  beforeEach(async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), 'zmt-path-guard-'));
    // Resolve up front so assertions compare against the symlink-followed
    // location (e.g. macOS /var -> /private/var).
    const realBase = await fs.realpath(base);
    vanilla = path.join(realBase, 'vanilla');
    mod = path.join(realBase, 'mod');
    outside = path.join(realBase, 'outside');
    await fs.mkdir(vanilla);
    await fs.mkdir(mod);
    await fs.mkdir(outside);

    const workspace: Workspace = {
      openMods: [
        { id: 'mod-1', name: 'mod', path: mod, permission: 'editable' },
      ],
    };
    vi.mocked(workspaceStoreService.get).mockReturnValue(workspace);
    vi.mocked(activeGameId).mockReturnValue('hoi4');
    vi.mocked(activeGameFolderPath).mockResolvedValue(vanilla);
  });

  afterEach(async () => {
    const realBase = path.dirname(vanilla);
    vi.mocked(workspaceStoreService.get).mockReset();
    vi.mocked(activeGameId).mockReset();
    vi.mocked(activeGameFolderPath).mockReset();
    await fs.rm(realBase, { force: true, recursive: true });
  });

  it('allows a read under the readonly vanilla source', async () => {
    const target = path.join(vanilla, 'file.txt');
    await fs.writeFile(target, 'hello');
    await expect(assertReadable(target)).resolves.toBeUndefined();
  });

  it('rejects FORBIDDEN for a write under the readonly vanilla source', async () => {
    const target = path.join(vanilla, 'file.txt');
    await fs.writeFile(target, 'hello');
    await expect(assertWritable(target)).rejects.toMatchObject({
      code: IPC_ERROR_CODES.FORBIDDEN,
    });
  });

  it('allows both read and write under an editable mod source', async () => {
    const target = path.join(mod, 'file.txt');
    await fs.writeFile(target, 'hello');
    await expect(assertReadable(target)).resolves.toBeUndefined();
    await expect(assertWritable(target)).resolves.toBeUndefined();
  });

  it('rejects FORBIDDEN for read and write when the target is under no source', async () => {
    const target = path.join(outside, 'file.txt');
    await fs.writeFile(target, 'hello');
    await expect(assertReadable(target)).rejects.toMatchObject({
      code: IPC_ERROR_CODES.FORBIDDEN,
    });
    await expect(assertWritable(target)).rejects.toMatchObject({
      code: IPC_ERROR_CODES.FORBIDDEN,
    });
  });

  it('rejects FORBIDDEN for a symlink under a source pointing outside every source', async () => {
    const escapeTarget = path.join(outside, 'secret.txt');
    await fs.writeFile(escapeTarget, 'secret');
    const link = path.join(vanilla, 'escape.txt');
    await fs.symlink(escapeTarget, link);
    await expect(assertReadable(link)).rejects.toMatchObject({
      code: IPC_ERROR_CODES.FORBIDDEN,
    });
  });
});
