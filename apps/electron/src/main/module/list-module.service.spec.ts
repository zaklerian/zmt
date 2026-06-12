import { IncludedMod, ProjectedSource } from '@contracts';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { listModules } from './list-module.service';

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
const MODULE_DIR = 'common/units/equipment/modules';

// An air archetype whose single slot accepts `air_engine`; the derivation stamps
// 'air' onto that category. `unreferenced_cat` is in no archetype's slots.
const AIR_ARCHETYPE_FILE = `equipments = {
\tsmall_airframe = {
\t\tis_archetype = yes
\t\ttype = fighter
\t\tmodule_slots = {
\t\t\tengine_slot = {
\t\t\t\tallowed_module_categories = {
\t\t\t\t\tair_engine
\t\t\t\t}
\t\t\t}
\t\t}
\t}
}
`;

const MODULES_FILE = `equipment_modules = {
\tengine_1 = {
\t\tcategory = air_engine
\t}
\tmystery_1 = {
\t\tcategory = unreferenced_cat
\t}
}
`;

let roots: string[] = [];

async function equipmentSource(
  permission: ProjectedSource['permission'],
): Promise<ProjectedSource> {
  const root = await mkdtemp(path.join(tmpdir(), 'zmt-equip-'));
  roots.push(root);
  await mkdir(path.join(root, EQUIPMENT_DIR), { recursive: true });
  await writeFile(
    path.join(root, EQUIPMENT_DIR, '00_archetypes.txt'),
    AIR_ARCHETYPE_FILE,
  );
  return { path: root, permission };
}

async function moduleSource(): Promise<{
  modulePath: string;
  source: ProjectedSource;
}> {
  const root = await mkdtemp(path.join(tmpdir(), 'zmt-modlist-'));
  roots.push(root);
  await mkdir(path.join(root, MODULE_DIR), { recursive: true });
  const modulePath = path.join(root, MODULE_DIR, '00_modules.txt');
  await writeFile(modulePath, MODULES_FILE);
  return { modulePath, source: { path: root, permission: 'editable' } };
}

describe('listModules', () => {
  beforeEach(() => {
    roots = [];
    state.sources = [];
    state.workspace = { includedMods: [] };
  });

  afterEach(async () => {
    await Promise.all(
      roots.map((root) => rm(root, { force: true, recursive: true })),
    );
  });

  it('classifies a module by an archetype slot in the same source and leaves an unreferenced category unclassified', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'zmt-modlist-'));
    roots.push(root);
    await mkdir(path.join(root, EQUIPMENT_DIR), { recursive: true });
    await mkdir(path.join(root, MODULE_DIR), { recursive: true });
    await writeFile(
      path.join(root, EQUIPMENT_DIR, '00_archetypes.txt'),
      AIR_ARCHETYPE_FILE,
    );
    const modulePath = path.join(root, MODULE_DIR, '00_modules.txt');
    await writeFile(modulePath, MODULES_FILE);
    state.sources = [{ path: root, permission: 'readonly' }];

    const entities = await listModules(modulePath);

    expect(entities.find((entity) => entity.name === 'engine_1')?.domain).toBe(
      'air',
    );
    expect(entities.find((entity) => entity.name === 'mystery_1')?.domain).toBe(
      'unclassified',
    );
  });

  it('classifies across sources: an archetype in vanilla domains a module defined in a mod', async () => {
    const vanilla = await equipmentSource('readonly');
    const { modulePath, source: mod } = await moduleSource();
    state.sources = [vanilla, mod];

    const entities = await listModules(modulePath);

    expect(entities.find((entity) => entity.name === 'engine_1')?.domain).toBe(
      'air',
    );
    expect(entities.find((entity) => entity.name === 'mystery_1')?.domain).toBe(
      'unclassified',
    );
  });
});
