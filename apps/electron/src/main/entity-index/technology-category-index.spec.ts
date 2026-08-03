import type { IncludedMod } from '@contracts';

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

const TAGS_DIR = 'common/technology_tags';

let roots: string[] = [];

function ids(
  rows: readonly { readonly slim: { readonly id: string } }[],
): string[] {
  return rows.map((row) => row.slim.id).sort();
}

// Writes one mod with technology_tags files. `replacePath` adds a descriptor that
// replaces the whole tags folder (BICE has no descriptor.mod, so replace_path is
// covered here synthetically per gate 2).
async function mod(
  id: string,
  permission: IncludedMod['permission'],
  files: Readonly<Record<string, readonly string[]>>,
  replacePath = false,
): Promise<IncludedMod> {
  const root = await mkdtemp(path.join(tmpdir(), 'zmt-cat-'));
  roots.push(root);
  await mkdir(path.join(root, TAGS_DIR), { recursive: true });
  for (const [fileName, categories] of Object.entries(files)) {
    await writeFile(path.join(root, TAGS_DIR, fileName), tagsFile(categories));
  }
  if (replacePath) {
    await writeFile(
      path.join(root, 'descriptor.mod'),
      `name = "${id}"\nreplace_path = "common/technology_tags"\n`,
    );
  }
  return { id, name: id, path: root, permission };
}

// Real-shape: bare category tokens directly under `technology_categories`, plus a
// `technology_folders` block the extractor must ignore (Q61).
function tagsFile(categories: readonly string[]): string {
  const body = categories.map((category) => `\t${category}`).join('\n');
  return `technology_categories = {\n${body}\n}\ntechnology_folders = {\n\tinfantry_folder = { ledger = army }\n}\n`;
}

describe('technology-category index (ZMT-35 gate 2)', () => {
  beforeEach(() => {
    roots = [];
    state.mods = [];
    entityIndexService.clear();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(
      roots.map((root) => rm(root, { force: true, recursive: true })),
    );
  });

  it('returns the declared category vocabulary as one slim row per token', async () => {
    const bice = await mod('bice', 'editable', {
      '00_technology.txt': ['armor', 'artillery', 'air_equipment'],
    });
    state.mods = [bice];

    const { rows } = await indexReadService.list('technologyCategory');
    expect(ids(rows)).toEqual(['air_equipment', 'armor', 'artillery']);
  });

  it('dedups a token declared in two sources to the higher-precedence source, with provenance per token', async () => {
    const vanilla = await mod('vanilla', 'readonly', {
      '00_vanilla.txt': ['armor', 'vanilla_only'],
    });
    const bice = await mod('bice', 'editable', {
      '00_bice.txt': ['armor', 'bice_only'],
    });
    state.mods = [vanilla, bice];

    const { rows, sources } = await indexReadService.list('technologyCategory');
    expect(ids(rows)).toEqual(['armor', 'bice_only', 'vanilla_only']);

    // The colliding token dedups to one row, won by the higher-precedence source,
    // and records the shadowed source — the union-with-provenance the picker needs.
    const armor = rows.find((row) => row.slim.id === 'armor');
    expect(armor?.provenance.sourceId).toBe(bice.path);
    expect(armor?.provenance.reason).toBe('overriding-definition');
    expect(armor?.provenance.shadowedSourceIds).toEqual([vanilla.path]);
    expect(sources[armor?.provenance.sourceId ?? '']).toEqual({
      modId: 'bice',
      path: bice.path,
      permission: 'editable',
    });

    // A category no other source declares is a sole definition of its own source.
    const vanillaOnly = rows.find((row) => row.slim.id === 'vanilla_only');
    expect(vanillaOnly?.provenance.reason).toBe('sole-definition');
    expect(vanillaOnly?.provenance.sourceId).toBe(vanilla.path);
  });

  it("honors replace_path: a mod that replaces the tags folder drops the lower source's categories", async () => {
    const vanilla = await mod('vanilla', 'readonly', {
      '00_vanilla.txt': ['armor', 'vanilla_only'],
    });
    const bice = await mod(
      'bice',
      'editable',
      { '00_bice.txt': ['bice_only'] },
      true,
    );
    state.mods = [vanilla, bice];

    const { rows } = await indexReadService.list('technologyCategory');
    expect(ids(rows)).toEqual(['bice_only']);
  });
});
