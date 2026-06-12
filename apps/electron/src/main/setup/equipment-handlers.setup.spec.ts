import {
  EquipmentEntity,
  EquipmentSlotsResult,
  IncludedMod,
  IPC_CHANNELS,
  ProjectedSource,
} from '@contracts';
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

const state = vi.hoisted(() => ({
  sources: [] as ProjectedSource[],
  workspace: { includedMods: [] as IncludedMod[] },
}));

vi.mock('../workspace', () => ({
  activeGameFolderPath: vi.fn(async () => null),
  activeGameId: vi.fn(() => 'hoi4'),
  resolveProjectedSources: vi.fn(() => state.sources),
  workspaceStoreService: { get: vi.fn(() => state.workspace) },
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
\t\tinterface_category = interface_category_land
\t\ttype = infantry
\t}
}
`;

const MOD_FILE = `equipments = {
\tmod_fighter = {
\t\tis_archetype = yes
\t\tinterface_category = interface_category_air
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

const SLOTS_FILE = `equipments = {
\tsmall_plane_airframe = {
\t\tis_archetype = yes
\t\ttype = { fighter }
\t\tmodule_slots = {
\t\t\tfixed_main_weapon = {
\t\t\t\trequired = yes
\t\t\t\tallowed_module_categories = {
\t\t\t\t\tfixed_air_weapon
\t\t\t\t}
\t\t\t}
\t\t\tengine_slot = {
\t\t\t\tallowed_module_categories = {
\t\t\t\t\tair_engine
\t\t\t\t}
\t\t\t}
\t\t}
\t\tdefault_modules = {
\t\t\tfixed_main_weapon = light_mg
\t\t\tengine_slot = engine_1
\t\t}
\t}
\tplain_airframe = {
\t\tis_archetype = yes
\t\ttype = { fighter }
\t}
}
`;

const MOD_ID = 'mod-1';
const SLOTS_RELATIVE = path.join(EQUIPMENT_DIR, 'air_archetypes.txt');

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

function slotsFor(entityName: string): Promise<EquipmentSlotsResult> {
  const handler = getCapturedHandler(IPC_CHANNELS.equipment.slots);
  return handler(makeInvokeEvent(), {
    entityName,
    modId: MOD_ID,
    relativePath: SLOTS_RELATIVE,
  }) as Promise<EquipmentSlotsResult>;
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
    await writeFile(path.join(modRoot, SLOTS_RELATIVE), SLOTS_FILE);

    state.workspace = {
      includedMods: [
        { id: MOD_ID, name: 'mod', path: modRoot, permission: 'readonly' },
      ],
    };

    registerEquipmentHandlers();
  });

  afterEach(async () => {
    await rm(vanillaRoot, { force: true, recursive: true });
    await rm(modRoot, { force: true, recursive: true });
  });

  it('classifies an archetype by interface_category and finds a variant ref across sources', async () => {
    state.sources = [readonlySource(vanillaRoot), editableSource(modRoot)];

    const entities = await listFor(modFilePath);

    // The archetype `infantry_equipment` is visible (higher source), so the
    // variant's ref resolves and it is not unresolved. Its domain, however, is
    // not stamped here: variant→archetype domain inheritance is deferred (ADR
    // 018 rule 4), so a variant carrying no interface_category does not classify.
    expect(
      entities.find((entity) => entity.name === 'mod_infantry_0')
        ?.classification,
    ).toEqual({ reason: 'regular-ref-not-typed', status: 'invalid' });
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

  it('projects slots and assignments for an archetype in a readonly source', async () => {
    state.sources = [readonlySource(modRoot)];

    const result = await slotsFor('small_plane_airframe');

    expect(result.slots).toEqual([
      {
        allowedCategories: ['fixed_air_weapon'],
        name: 'fixed_main_weapon',
        required: true,
      },
      {
        allowedCategories: ['air_engine'],
        name: 'engine_slot',
        required: false,
      },
    ]);
    expect(result.assignments).toEqual([
      { key: 'fixed_main_weapon', value: 'light_mg' },
      { key: 'engine_slot', value: 'engine_1' },
    ]);
  });

  it('returns an empty slot list for an archetype with no module_slots', async () => {
    state.sources = [readonlySource(modRoot)];

    const result = await slotsFor('plain_airframe');

    expect(result.slots).toEqual([]);
    expect(result.assignments).toEqual([]);
  });

  it('rejects slots with 404 when the archetype is absent', async () => {
    state.sources = [readonlySource(modRoot)];

    await expect(slotsFor('ghost_airframe')).rejects.toSatisfy(
      (error) => extractIpcError(error).code === 404,
    );
  });
});
