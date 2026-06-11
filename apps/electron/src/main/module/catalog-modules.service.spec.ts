import { CatalogModule, ProjectedSource } from '@contracts';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { catalogModules } from './catalog-modules.service';

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

function modulesBlock(entries: Readonly<Record<string, string>>): string {
  const body = Object.entries(entries)
    .map(([name, category]) => `\t${name} = {\n\t\tcategory = ${category}\n\t}`)
    .join('\n');
  return `equipment_modules = {\n${body}\n}\n`;
}

async function source(
  permission: ProjectedSource['permission'],
  files: Readonly<Record<string, Readonly<Record<string, string>>>>,
): Promise<ProjectedSource> {
  const root = await mkdtemp(path.join(tmpdir(), 'zmt-catalog-'));
  roots.push(root);
  await mkdir(path.join(root, MODULE_DIR), { recursive: true });
  for (const [fileName, entries] of Object.entries(files)) {
    await writeFile(
      path.join(root, MODULE_DIR, fileName),
      modulesBlock(entries),
    );
  }
  return { path: root, permission };
}

let roots: string[] = [];

describe('catalogModules', () => {
  beforeEach(() => {
    roots = [];
    state.sources = [];
  });

  afterEach(async () => {
    await Promise.all(
      roots.map((root) => rm(root, { force: true, recursive: true })),
    );
  });

  it('aggregates non-colliding modules from every source, classifying by category', async () => {
    const vanilla = await source('readonly', {
      '00_modules.txt': { engine_small_1: 'engine' },
    });
    const mod = await source('editable', {
      '00_modules.txt': { ship_gun_1: 'ship_light_battery' },
    });
    state.sources = [vanilla, mod];

    const catalog = await catalogModules();

    expect(byName(catalog, 'engine_small_1')).toMatchObject({
      domain: 'air',
      source: vanilla.path,
    });
    expect(byName(catalog, 'ship_gun_1')).toMatchObject({
      domain: 'naval',
      source: mod.path,
    });
    expect(catalog).toHaveLength(2);
  });

  it('dedups a name collision to the higher-precedence source', async () => {
    const vanilla = await source('readonly', {
      '00_modules.txt': { shared_engine: 'engine' },
    });
    const mod = await source('editable', {
      '00_modules.txt': { shared_engine: 'armament_type' },
    });
    state.sources = [vanilla, mod];

    const catalog = await catalogModules();

    expect(
      catalog.filter((entry) => entry.name === 'shared_engine'),
    ).toHaveLength(1);
    expect(byName(catalog, 'shared_engine')).toMatchObject({
      category: 'armament_type',
      domain: 'land',
      source: mod.path,
    });
  });

  it('lets a mod override a vanilla module while keeping vanilla-only and mod-only entries', async () => {
    const vanilla = await source('readonly', {
      '00_modules.txt': { shared: 'engine', vanilla_only: 'engine' },
    });
    const mod = await source('editable', {
      '00_modules.txt': {
        mod_only: 'ship_light_battery',
        shared: 'armament_type',
      },
    });
    state.sources = [vanilla, mod];

    const catalog = await catalogModules();

    expect(byName(catalog, 'vanilla_only').source).toBe(vanilla.path);
    expect(byName(catalog, 'mod_only').source).toBe(mod.path);
    expect(byName(catalog, 'shared').source).toBe(mod.path);
    expect(catalog).toHaveLength(3);
  });

  it('skips a source with no modules directory', async () => {
    const empty = await mkdtemp(path.join(tmpdir(), 'zmt-catalog-empty-'));
    roots.push(empty);
    const mod = await source('editable', {
      '00_modules.txt': { engine_small_1: 'engine' },
    });
    state.sources = [{ path: empty, permission: 'readonly' }, mod];

    const catalog = await catalogModules();

    expect(catalog).toHaveLength(1);
    expect(byName(catalog, 'engine_small_1').source).toBe(mod.path);
  });
});

function byName(
  catalog: readonly CatalogModule[],
  name: string,
): CatalogModule {
  const found = catalog.find((entry) => entry.name === name);
  if (found === undefined) {
    throw new Error(`No catalog module named ${name}`);
  }
  return found;
}
