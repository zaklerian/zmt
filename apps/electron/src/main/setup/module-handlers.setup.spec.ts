import { IPC_CHANNELS, ModuleEntity, ProjectedSource } from '@contracts';
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
import { registerModuleHandlers } from './module-handlers.setup';

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

const MODULE_DIR = 'common/units/equipment/modules';

const MODULE_FILE = `equipment_modules = {
\tengine_small_1 = {
\t\tcategory = engine
\t\tadd_stats = {
\t\t\tair_range = 100
\t\t}
\t}
\tship_gun_1 = {
\t\tcategory = ship_light_battery
\t}
\tmodder_widget = {
\t\tcategory = totally_made_up
\t}
}
`;

let modRoot: string;
let moduleFilePath: string;

function editableSource(sourcePath: string): ProjectedSource {
  return { path: sourcePath, permission: 'editable' };
}

async function listFor(filePath: string): Promise<readonly ModuleEntity[]> {
  const handler = getCapturedHandler(IPC_CHANNELS.module.list);
  return (await handler(
    makeInvokeEvent(),
    filePath,
  )) as readonly ModuleEntity[];
}

describe('registerModuleHandlers', () => {
  beforeEach(async () => {
    vi.mocked(ipcMain.handle).mockReset();

    modRoot = await mkdtemp(path.join(tmpdir(), 'zmt-mod-'));
    await mkdir(path.join(modRoot, MODULE_DIR), { recursive: true });

    moduleFilePath = path.join(modRoot, MODULE_DIR, '00_air_modules.txt');
    await writeFile(moduleFilePath, MODULE_FILE);

    registerModuleHandlers();
  });

  afterEach(async () => {
    await rm(modRoot, { force: true, recursive: true });
  });

  it('classifies modules by category, projecting scalar and stat-block fields', async () => {
    state.sources = [editableSource(modRoot)];

    const entities = await listFor(moduleFilePath);

    expect(
      entities.find((entity) => entity.name === 'engine_small_1'),
    ).toMatchObject({ category: 'engine', domain: 'air' });
    expect(
      entities.find((entity) => entity.name === 'engine_small_1')?.statBlocks
        .add_stats,
    ).toEqual([{ key: 'air_range', value: '100' }]);
    expect(
      entities.find((entity) => entity.name === 'ship_gun_1')?.domain,
    ).toBe('naval');
    expect(
      entities.find((entity) => entity.name === 'modder_widget')?.domain,
    ).toBe('unclassified');
  });

  it('rejects with code 400 when filePath is not a string', async () => {
    state.sources = [editableSource(modRoot)];

    const handler = getCapturedHandler(IPC_CHANNELS.module.list);
    await expect(handler(makeInvokeEvent(), 42)).rejects.toSatisfy(
      (error) => extractIpcError(error).code === 400,
    );
  });
});
