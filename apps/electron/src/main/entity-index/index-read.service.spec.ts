import type { IncludedMod } from '@contracts';

import { IPC_ERROR_CODES } from '@contracts';
import { promises as fsPromises } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

const { entityIndexService } = await import('./entity-index.service');
const { indexReadService } = await import('./index-read.service');

const TECHNOLOGY_DIR = 'common/technologies';
const MODULE_DIR = 'common/units/equipment/modules';

// A real-shape technologies file: a `wide` node (positioned, declares
// enable_equipments), a `simple` node (positioned, no enable_equipments), and a
// `sub` node (no own position — the engine attaches it to a parent).
const TECHNOLOGY_FILE = `technologies = {
\tfighter1 = {
\t\tstart_year = 1936
\t\tcategories = { air_equipment }
\t\tenable_equipments = { small_plane_airframe_1 }
\t\tfolder = { name = air_techs position = { x = 2 y = 4 } }
\t\tpath = { leads_to_tech = fighter2 }
\t\tdependencies = { engine_1 }
\t}
\tradar1 = {
\t\tstart_year = 1934
\t\tfolder = { position = { x = 1 y = 0 } }
\t}
\tsub_fighter1 = {
\t}
}
`;

const MODULE_FILE = `equipment_modules = {
\tengine_small_1 = { category = engine }
\tship_gun_1 = { category = ship_light_battery }
}
`;

let root = '';

async function seedMod(): Promise<void> {
  root = await mkdtemp(path.join(tmpdir(), 'zmt-idx-'));
  await mkdir(path.join(root, TECHNOLOGY_DIR), { recursive: true });
  await mkdir(path.join(root, MODULE_DIR), { recursive: true });
  await writeFile(
    path.join(root, TECHNOLOGY_DIR, '00_air.txt'),
    TECHNOLOGY_FILE,
  );
  await writeFile(path.join(root, MODULE_DIR, '00_mod.txt'), MODULE_FILE);
  state.mods = [
    { id: 'bice', name: 'bice', path: root, permission: 'editable' },
  ];
}

describe('indexReadService', () => {
  beforeEach(async () => {
    state.mods = [];
    entityIndexService.clear();
    await seedMod();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(root, { force: true, recursive: true });
  });

  describe('list — slim technology rows (gate 2)', () => {
    it('projects a wide node with resolved position and distinct edge lists', async () => {
      const { rows } = await indexReadService.list('technology');
      const wide = rows.find((row) => row.slim.id === 'fighter1');

      expect(wide?.slim).toMatchObject({
        categories: ['air_equipment'],
        dependencyTargets: ['engine_1'],
        nodeKind: 'wide',
        pathTargets: ['fighter2'],
        position: { x: 2, y: 4 },
        startYear: 1936,
      });
    });

    it('projects a simple node (positioned, no enable_equipments)', async () => {
      const { rows } = await indexReadService.list('technology');
      const simple = rows.find((row) => row.slim.id === 'radar1');

      expect(simple?.slim.nodeKind).toBe('simple');
      expect(simple?.slim.position).toEqual({ x: 1, y: 0 });
    });

    it('projects a sub node (no own position) with a null position', async () => {
      const { rows } = await indexReadService.list('technology');
      const sub = rows.find((row) => row.slim.id === 'sub_fighter1');

      expect(sub?.slim.nodeKind).toBe('sub');
      expect(sub?.slim.position).toBeNull();
    });

    it('rides provenance on every row and joins source detail through the sources table', async () => {
      const { rows, sources } = await indexReadService.list('technology');
      const row = rows.find((entry) => entry.slim.id === 'fighter1');
      const sourceId = row?.provenance.sourceId;

      expect(sourceId).toBeDefined();
      expect(sources[sourceId ?? '']).toEqual({
        modId: 'bice',
        path: root,
        permission: 'editable',
      });
      // Source DETAIL is not duplicated onto the row (ADR 024 decision 3).
      expect(row?.slim).not.toHaveProperty('path');
    });
  });

  describe('list — the module projector is the second shape (gate 5)', () => {
    it('projects module rows as { category, id, name }', async () => {
      const { rows } = await indexReadService.list('module');

      expect(
        rows.map((row) => row.slim).sort((a, b) => a.id.localeCompare(b.id)),
      ).toEqual([
        { category: 'engine', id: 'engine_small_1', name: 'engine_small_1' },
        {
          category: 'ship_light_battery',
          id: 'ship_gun_1',
          name: 'ship_gun_1',
        },
      ]);
    });
  });

  describe('detail (gate 3)', () => {
    it('returns the full IndexedEntity for a known id', async () => {
      const detail = await indexReadService.detail('technology', 'fighter1');

      expect(detail.id).toBe('fighter1');
      expect(detail.entity.token).toBe('fighter1');
      expect(detail.entity.enableEquipments).toEqual([
        'small_plane_airframe_1',
      ]);
      expect(detail.provenance.sourceId).toBe(root);
    });

    it('returns a clean NOT_FOUND for an unknown id (ADR 008), not a thrown raw error', async () => {
      await expect(
        indexReadService.detail('technology', 'no_such_tech'),
      ).rejects.toMatchObject({ code: IPC_ERROR_CODES.NOT_FOUND });
    });
  });

  describe('cache (gate 4)', () => {
    it('serves list and detail from the same cached snapshot — detail does not re-resolve', async () => {
      const readFileSpy = vi.spyOn(fsPromises, 'readFile');
      // Stage 1 (enumeration) re-reads the descriptor on every call by design; the
      // cache guards the parse-heavy stage 2. Counting reads of the ENTITY file
      // alone isolates stage-2 re-resolution — a cache hit parses it zero times.
      const entityFileReads = (): number =>
        readFileSpy.mock.calls.filter(([target]) =>
          String(target).includes('00_air.txt'),
        ).length;

      await indexReadService.list('technology');
      expect(entityFileReads()).toBe(1);

      await indexReadService.detail('technology', 'fighter1');
      expect(entityFileReads()).toBe(1);
    });
  });
});
