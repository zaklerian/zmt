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

const MODULE_DIR = 'common/units/equipment/modules';

const MODULES_FILE = `equipment_modules = {
\tengine_1 = {
\t\tcategory = air_engine
\t}
\tmystery_1 = {
\t\tcategory = unreferenced_cat
\t}
\tnameless_1 = {
\t}
}
`;

let roots: string[] = [];

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

  it('reads the file losslessly, surfacing each module name and category', async () => {
    const { modulePath, source } = await moduleSource();
    state.sources = [source];

    const entities = await listModules(modulePath);

    expect(entities.map((entity) => entity.name)).toEqual([
      'engine_1',
      'mystery_1',
      'nameless_1',
    ]);
    expect(
      entities.find((entity) => entity.name === 'engine_1')?.category,
    ).toBe('air_engine');
    expect(
      entities.find((entity) => entity.name === 'mystery_1')?.category,
    ).toBe('unreferenced_cat');
    expect(
      entities.find((entity) => entity.name === 'nameless_1')?.category,
    ).toBe('');
  });

  it('consults no archetype data — module listing is a pure per-file read', async () => {
    const { modulePath, source } = await moduleSource();
    state.sources = [source];

    const entities = await listModules(modulePath);

    for (const entity of entities) {
      expect(entity).not.toHaveProperty('domain');
    }
  });
});
