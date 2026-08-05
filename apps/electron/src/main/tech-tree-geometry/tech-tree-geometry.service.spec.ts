import type { IncludedMod } from '@contracts';

import { mkdir, mkdtemp, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  gameFolder: null as null | string,
  mods: [] as IncludedMod[],
}));

vi.mock('../workspace', () => ({
  activeGameFolderPath: vi.fn(async () => state.gameFolder),
  activeGameId: vi.fn(() => 'hoi4'),
  workspaceStoreService: { get: vi.fn(() => ({ includedMods: state.mods })) },
}));

vi.mock('../plugins', () => ({
  pluginRegistryService: {
    list: vi.fn(() => [{ parserExtension: { dialects: [] } }]),
  },
}));

const { techTreeGeometryService } = await import(
  './tech-tree-geometry.service'
);

const GUI_PATH = 'interface/countrytechtreeview.gui';

// A minimal real-shape tree-view `.gui` with a single folder whose background
// sprite carries the source's marker, so the winning source is identifiable in the
// projected geometry.
function gui(marker: string): string {
  return `guiTypes = {
	containerWindowType = {
		name = "countrytechtreeview"
		containerWindowType = {
			name = "air_techs_folder"
			containerWindowType = {
				name = "techtree_stripes"
				size = { width = 3720 height = 1300 }
				iconType = {
					name = "bg"
					spriteType = "GFX_${marker}_bg"
				}
			}
			gridboxtype = {
				name = "generic_fighter_tree"
				position = { x = 340 y = 32 }
				slotsize = { width = 70 height = 70 }
				format = "UP"
			}
		}
	}
}
`;
}

let roots: string[] = [];

async function source(
  id: string,
  permission: IncludedMod['permission'],
  options: { readonly gui?: string; readonly replaceInterface?: boolean } = {},
): Promise<IncludedMod> {
  const root = await mkdtemp(path.join(tmpdir(), 'zmt-geom-'));
  roots.push(root);
  if (options.gui !== undefined) {
    await mkdir(path.join(root, 'interface'), { recursive: true });
    await writeFile(path.join(root, GUI_PATH), options.gui);
  }
  await writeFile(
    path.join(root, 'descriptor.mod'),
    `name = "${id}"\n${options.replaceInterface ? 'replace_path = "interface"\n' : ''}`,
  );
  return { id, name: id, path: root, permission };
}

describe('techTreeGeometryService', () => {
  beforeEach(() => {
    roots = [];
    state.mods = [];
    state.gameFolder = null;
    techTreeGeometryService.clear();
  });

  afterEach(async () => {
    await Promise.all(
      roots.map((root) => rm(root, { force: true, recursive: true })),
    );
  });

  it('resolves from the sole source with sole-provider provenance', async () => {
    const vanilla = await source('vanilla', 'readonly', {
      gui: gui('vanilla'),
    });
    state.gameFolder = vanilla.path;

    const geometry = await techTreeGeometryService.read();

    expect(geometry.folders.air_techs_folder?.background).toBe(
      'GFX_vanilla_bg',
    );
    expect(geometry.provenance).toMatchObject({
      absolutePath: path.join(vanilla.path, GUI_PATH),
      modId: null,
      reason: 'sole-provider',
      relativePath: GUI_PATH,
    });
  });

  it('a mod-overridden .gui wins over vanilla (same file name → last-wins) with the mod as provenance', async () => {
    const vanilla = await source('vanilla', 'readonly', {
      gui: gui('vanilla'),
    });
    const mod = await source('bice', 'editable', { gui: gui('bice') });
    state.gameFolder = vanilla.path;
    state.mods = [mod];

    const geometry = await techTreeGeometryService.read();

    // The mod's .gui wins: its background marker, not vanilla's.
    expect(geometry.folders.air_techs_folder?.background).toBe('GFX_bice_bg');
    expect(geometry.provenance).toMatchObject({
      absolutePath: path.join(mod.path, GUI_PATH),
      modId: 'bice',
      reason: 'last-wins',
    });
  });

  it('a replace_path = interface mod wins with replace-path provenance', async () => {
    const vanilla = await source('vanilla', 'readonly', {
      gui: gui('vanilla'),
    });
    const mod = await source('bice', 'editable', {
      gui: gui('bice'),
      replaceInterface: true,
    });
    state.gameFolder = vanilla.path;
    state.mods = [mod];

    const geometry = await techTreeGeometryService.read();

    expect(geometry.folders.air_techs_folder?.background).toBe('GFX_bice_bg');
    expect(geometry.provenance).toMatchObject({
      modId: 'bice',
      reason: 'replace-path',
    });
  });

  it('returns an empty map with null provenance when no source declares the .gui', async () => {
    const vanilla = await source('vanilla', 'readonly');
    state.gameFolder = vanilla.path;

    const geometry = await techTreeGeometryService.read();

    expect(geometry.folders).toEqual({});
    expect(geometry.provenance).toBeNull();
  });

  it('rebuilds when the winning .gui mtime changes', async () => {
    const vanilla = await source('vanilla', 'readonly', { gui: gui('one') });
    state.gameFolder = vanilla.path;

    expect(
      (await techTreeGeometryService.read()).folders.air_techs_folder
        ?.background,
    ).toBe('GFX_one_bg');

    const absolute = path.join(vanilla.path, GUI_PATH);
    await writeFile(absolute, gui('two'));
    const now = await stat(absolute);
    await utimes(absolute, now.atime, new Date(now.mtimeMs + 2000));

    expect(
      (await techTreeGeometryService.read()).folders.air_techs_folder
        ?.background,
    ).toBe('GFX_two_bg');
  });
});
