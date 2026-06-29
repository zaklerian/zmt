import { CharacterEntity, IPC_CHANNELS, ProjectedSource } from '@contracts';
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
import { registerCharacterHandlers } from './character-handlers.setup';

const state = vi.hoisted(() => ({ sources: [] as ProjectedSource[] }));

vi.mock('../workspace', () => ({
  activeGameFolderPath: vi.fn(async () => null),
  activeGameId: vi.fn(() => 'hoi4'),
  resolveProjectedSources: vi.fn(() => state.sources),
  workspaceStoreService: { get: vi.fn(() => ({ includedMods: [] })) },
}));

vi.mock('../plugins', () => ({
  pluginRegistryService: {
    list: vi.fn(() => [{ parserExtension: { dialects: [] } }]),
  },
}));

const CHARACTER_DIR = 'common/characters';

const CHARACTER_FILE = `characters = {
\tSome_Leader = {
\t\tname = "NAME_KEY"
\t\tcorps_commander = {
\t\t\tskill = 4
\t\t\ttraits = {
\t\t\t\ttrait_one
\t\t\t}
\t\t}
\t}
}
`;

let modRoot: string;
let characterFilePath: string;

function editableSource(sourcePath: string): ProjectedSource {
  return { path: sourcePath, permission: 'editable' };
}

async function listFor(filePath: string): Promise<readonly CharacterEntity[]> {
  const handler = getCapturedHandler(IPC_CHANNELS.character.list);
  return (await handler(
    makeInvokeEvent(),
    filePath,
  )) as readonly CharacterEntity[];
}

describe('registerCharacterHandlers', () => {
  beforeEach(async () => {
    vi.mocked(ipcMain.handle).mockReset();

    modRoot = await mkdtemp(path.join(tmpdir(), 'zmt-char-'));
    await mkdir(path.join(modRoot, CHARACTER_DIR), { recursive: true });

    characterFilePath = path.join(modRoot, CHARACTER_DIR, '00_leaders.txt');
    await writeFile(characterFilePath, CHARACTER_FILE);

    registerCharacterHandlers();
  });

  afterEach(async () => {
    await rm(modRoot, { force: true, recursive: true });
  });

  it('reads characters per file, projecting the token and role traits', async () => {
    state.sources = [editableSource(modRoot)];

    const entities = await listFor(characterFilePath);

    expect(entities.map((entity) => entity.token)).toEqual(['Some_Leader']);
    expect(entities[0]?.roles).toEqual([
      {
        bags: [],
        id: 'corps_commander',
        scalars: [{ key: 'skill', value: '4' }],
        scope: [],
        traits: ['trait_one'],
      },
    ]);
  });

  it('rejects with code 400 when filePath is not a string', async () => {
    state.sources = [editableSource(modRoot)];

    const handler = getCapturedHandler(IPC_CHANNELS.character.list);
    await expect(handler(makeInvokeEvent(), 42)).rejects.toSatisfy(
      (error) => extractIpcError(error).code === 400,
    );
  });
});
