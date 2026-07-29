import type { IncludedMod } from '@contracts';

import { IPC_CHANNELS, IPC_ERROR_CODES } from '@contracts';
import { ipcMain } from 'electron';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  extractIpcError,
  getCapturedHandler,
  makeInvokeEvent,
} from './__test-utils__/capture-ipc-handler';

const state = vi.hoisted(() => ({ mods: [] as IncludedMod[] }));

vi.mock('../workspace', () => ({
  activeGameFolderPath: vi.fn(async () => null),
  activeGameId: vi.fn(() => 'hoi4'),
  workspaceStoreService: { get: vi.fn(() => ({ includedMods: state.mods })) },
}));

vi.mock('../plugins', () => ({
  pluginRegistryService: {
    list: vi.fn(() => [{ parserExtension: { dialects: [] } }]),
  },
}));

const { entityIndexService } = await import('../entity-index');
const { registerIndexHandlers } = await import('./index-handlers.setup');

const TECHNOLOGY_DIR = 'common/technologies';

const TECHNOLOGY_FILE = `technologies = {
\tfighter1 = { folder = { position = { x = 1 y = 2 } } }
}
`;

let root = '';

describe('registerIndexHandlers', () => {
  beforeEach(async () => {
    vi.mocked(ipcMain.handle).mockReset();
    entityIndexService.clear();

    root = await mkdtemp(path.join(tmpdir(), 'zmt-idxh-'));
    await mkdir(path.join(root, TECHNOLOGY_DIR), { recursive: true });
    await writeFile(
      path.join(root, TECHNOLOGY_DIR, '00_air.txt'),
      TECHNOLOGY_FILE,
    );
    state.mods = [
      { id: 'bice', name: 'bice', path: root, permission: 'editable' },
    ];

    registerIndexHandlers();
  });

  afterEach(async () => {
    await rm(root, { force: true, recursive: true });
  });

  it('list returns slim rows and the sources table for a known entity type', async () => {
    const handler = getCapturedHandler(IPC_CHANNELS.index.list);
    const result = (await handler(makeInvokeEvent(), 'technology')) as {
      readonly rows: readonly { readonly slim: { readonly id: string } }[];
    };

    expect(result.rows.map((row) => row.slim.id)).toContain('fighter1');
  });

  it('list rejects an unknown entity type with code 400 (ADR 008)', async () => {
    const handler = getCapturedHandler(IPC_CHANNELS.index.list);

    await expect(handler(makeInvokeEvent(), 'not_an_entity')).rejects.toSatisfy(
      (error) => extractIpcError(error).code === IPC_ERROR_CODES.BAD_REQUEST,
    );
  });

  it('detail returns the full entity for a known id', async () => {
    const handler = getCapturedHandler(IPC_CHANNELS.index.detail);
    const detail = (await handler(
      makeInvokeEvent(),
      'technology',
      'fighter1',
    )) as { readonly entity: { readonly token: string } };

    expect(detail.entity.token).toBe('fighter1');
  });

  it('detail returns a clean 404 for an unknown id (ADR 008)', async () => {
    const handler = getCapturedHandler(IPC_CHANNELS.index.detail);

    await expect(
      handler(makeInvokeEvent(), 'technology', 'no_such_tech'),
    ).rejects.toSatisfy(
      (error) => extractIpcError(error).code === IPC_ERROR_CODES.NOT_FOUND,
    );
  });

  it('detail rejects a non-string id with code 400', async () => {
    const handler = getCapturedHandler(IPC_CHANNELS.index.detail);

    await expect(
      handler(makeInvokeEvent(), 'technology', 42),
    ).rejects.toSatisfy(
      (error) => extractIpcError(error).code === IPC_ERROR_CODES.BAD_REQUEST,
    );
  });
});
