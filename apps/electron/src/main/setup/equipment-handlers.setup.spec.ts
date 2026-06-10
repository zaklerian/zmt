import { EquipmentEntity, IPC_CHANNELS, ProjectedSource } from '@contracts';
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
import { registerEquipmentHandlers } from './equipment-handlers.setup';

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

const EQUIPMENT_DIR = 'common/units/equipment';

const VANILLA_FILE = `equipments = {
\tinfantry_equipment = {
\t\tis_archetype = yes
\t\ttype = infantry
\t}
}
`;

const MOD_FILE = `equipments = {
\tmod_fighter = {
\t\tis_archetype = yes
\t\ttype = fighter
\t}
\tmod_infantry_0 = {
\t\tarchetype = infantry_equipment
\t}
\tmod_orphan = {
\t\tarchetype = ghost_equipment
\t}
}
`;

let vanillaRoot: string;
let modRoot: string;
let vanillaFilePath: string;
let modFilePath: string;

function editableSource(sourcePath: string): ProjectedSource {
  return { path: sourcePath, permission: 'editable' };
}

async function listFor(filePath: string): Promise<readonly EquipmentEntity[]> {
  const handler = getCapturedHandler(IPC_CHANNELS.equipment.list);
  return (await handler(
    makeInvokeEvent(),
    filePath,
  )) as readonly EquipmentEntity[];
}

function readonlySource(sourcePath: string): ProjectedSource {
  return { path: sourcePath, permission: 'readonly' };
}

describe('registerEquipmentHandlers', () => {
  beforeEach(async () => {
    vi.mocked(ipcMain.handle).mockReset();

    vanillaRoot = await mkdtemp(path.join(tmpdir(), 'zmt-vanilla-'));
    modRoot = await mkdtemp(path.join(tmpdir(), 'zmt-mod-'));
    await mkdir(path.join(vanillaRoot, EQUIPMENT_DIR), { recursive: true });
    await mkdir(path.join(modRoot, EQUIPMENT_DIR), { recursive: true });

    vanillaFilePath = path.join(
      vanillaRoot,
      EQUIPMENT_DIR,
      '00_archetypes.txt',
    );
    modFilePath = path.join(modRoot, EQUIPMENT_DIR, 'mod_equipment.txt');
    await writeFile(vanillaFilePath, VANILLA_FILE);
    await writeFile(modFilePath, MOD_FILE);

    registerEquipmentHandlers();
  });

  afterEach(async () => {
    await rm(vanillaRoot, { force: true, recursive: true });
    await rm(modRoot, { force: true, recursive: true });
  });

  it('classifies entities in a writable-mod file, resolving an archetype from a higher source', async () => {
    state.sources = [readonlySource(vanillaRoot), editableSource(modRoot)];

    const entities = await listFor(modFilePath);

    expect(
      entities.find((entity) => entity.name === 'mod_infantry_0')
        ?.classification,
    ).toEqual({ domain: 'land', status: 'classified', type: ['infantry'] });
    expect(
      entities.find((entity) => entity.name === 'mod_fighter')?.classification,
    ).toEqual({ domain: 'air', status: 'classified', type: ['fighter'] });
  });

  it('classifies entities in a readonly vanilla file', async () => {
    state.sources = [readonlySource(vanillaRoot)];

    const entities = await listFor(vanillaFilePath);

    expect(
      entities.find((entity) => entity.name === 'infantry_equipment'),
    ).toMatchObject({
      classification: {
        domain: 'land',
        status: 'classified',
        type: ['infantry'],
      },
      kind: 'archetype',
    });
  });

  it('returns unresolved when the archetype lives outside the visible source set', async () => {
    state.sources = [editableSource(modRoot)];

    const entities = await listFor(modFilePath);

    expect(
      entities.find((entity) => entity.name === 'mod_infantry_0')
        ?.classification,
    ).toEqual({ archetypeRef: 'infantry_equipment', status: 'unresolved' });
  });

  it('rejects with code 400 when filePath is not a string', async () => {
    state.sources = [readonlySource(vanillaRoot)];

    const handler = getCapturedHandler(IPC_CHANNELS.equipment.list);
    await expect(handler(makeInvokeEvent(), 42)).rejects.toSatisfy(
      (error) => extractIpcError(error).code === 400,
    );
  });
});
