import {
  EntityDeleteRequest,
  EntityWriteRequest,
  IncludedMod,
  IPC_CHANNELS,
  ProjectedSource,
} from '@contracts';
import { type BlockChild, type BlockNode, parse } from '@paradox-parser';
import { ipcMain } from 'electron';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  extractIpcError,
  getCapturedHandler,
  makeInvokeEvent,
} from './__test-utils__/capture-ipc-handler';
import { registerEntityHandlers } from './entity-handlers.setup';

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

const MOD_ID = 'mod-1';
const RELATIVE_PATH = 'entities.txt';

const FIXTURE = `equipments = {
\t# archetype block
\tinfantry_equipment = {
\t\tis_archetype = yes
\t\ttype = infantry
\t\treliability = 0.8
\t\tmax_organisation = 60
\t\tmodules = {
\t\t\tslot = yes
\t\t}
\t}
\tartillery_equipment = {
\t\tis_archetype = yes
\t\ttype = artillery
\t\treliability = 0.5
\t}
\tengine_module = {
\t\tname = engine
\t\tadd_stats = {
\t\t\t# tuned for range
\t\t\tair_range = 100
\t\t\treliability = 0.4
\t\t}
\t}
\tarmor_module = {
\t\tname = armor
\t}
\tfuel_module = {
\t\tname = fuel
\t\tadd_stats = {
\t\t\tair_range = 50
\t\t}
\t}
}
`;

let modRoot: string;
let filePath: string;

function deleteVia(request: EntityDeleteRequest): Promise<unknown> {
  return getCapturedHandler(IPC_CHANNELS.entity.delete)(
    makeInvokeEvent(),
    request,
  );
}

function writeVia(request: EntityWriteRequest): Promise<unknown> {
  return getCapturedHandler(IPC_CHANNELS.entity.write)(
    makeInvokeEvent(),
    request,
  );
}

describe('registerEntityHandlers', () => {
  beforeEach(async () => {
    vi.mocked(ipcMain.handle).mockReset();

    modRoot = await mkdtemp(path.join(tmpdir(), 'zmt-entity-'));
    filePath = path.join(modRoot, RELATIVE_PATH);
    await writeFile(filePath, FIXTURE);

    state.sources = [{ path: modRoot, permission: 'editable' }];
    state.workspace = {
      includedMods: [
        { id: MOD_ID, name: 'mod', path: modRoot, permission: 'editable' },
      ],
    };

    registerEntityHandlers();
  });

  afterEach(async () => {
    await rm(modRoot, { force: true, recursive: true });
  });

  it('patches only the changed field via a root-scoped delta, leaving siblings, nested blocks, and comments byte-identical', async () => {
    await writeVia({
      deltas: [
        {
          added: [],
          block: null,
          changed: [{ key: 'reliability', value: '0.9' }],
          removed: [],
        },
      ],
      entityName: 'infantry_equipment',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    expect(await readFile(filePath, 'utf8')).toBe(
      FIXTURE.replace('reliability = 0.8', 'reliability = 0.9'),
    );
  });

  it('inserts an added field at the indentation of existing scalars before the closing brace', async () => {
    await writeVia({
      deltas: [
        {
          added: [{ key: 'cost', value: '10' }],
          block: null,
          changed: [],
          removed: [],
        },
      ],
      entityName: 'infantry_equipment',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    expect(await readFile(filePath, 'utf8')).toBe(
      FIXTURE.replace(
        '\t\t}\n\t}\n\tartillery_equipment',
        '\t\t}\n\t\tcost = 10\n\t}\n\tartillery_equipment',
      ),
    );
  });

  it('removes a field with no blank line left behind', async () => {
    await writeVia({
      deltas: [
        {
          added: [],
          block: null,
          changed: [],
          removed: ['max_organisation'],
        },
      ],
      entityName: 'infantry_equipment',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    expect(await readFile(filePath, 'utf8')).toBe(
      FIXTURE.replace('\t\tmax_organisation = 60\n', ''),
    );
  });

  it('patches a stat inside a named child block, leaving sibling stats, comments, and other blocks byte-identical', async () => {
    await writeVia({
      deltas: [
        {
          added: [],
          block: ['add_stats'],
          changed: [{ key: 'reliability', value: '0.45' }],
          removed: [],
        },
      ],
      entityName: 'engine_module',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    expect(await readFile(filePath, 'utf8')).toBe(
      FIXTURE.replace('reliability = 0.4\n', 'reliability = 0.45\n'),
    );
  });

  it('creates the child block at the entity child indentation when adding the first stat', async () => {
    await writeVia({
      deltas: [
        {
          added: [{ key: 'air_attack', value: '7' }],
          block: ['add_stats'],
          changed: [],
          removed: [],
        },
      ],
      entityName: 'armor_module',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    expect(await readFile(filePath, 'utf8')).toBe(
      FIXTURE.replace(
        '\t\tname = armor\n\t}',
        '\t\tname = armor\n\t\tadd_stats = {\n\t\t\tair_attack = 7\n\t\t}\n\t}',
      ),
    );
  });

  it('drops the whole child block when its last stat is removed, leaving no empty braces', async () => {
    await writeVia({
      deltas: [
        {
          added: [],
          block: ['add_stats'],
          changed: [],
          removed: ['air_range'],
        },
      ],
      entityName: 'fuel_module',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    expect(await readFile(filePath, 'utf8')).toBe(
      FIXTURE.replace('\t\tadd_stats = {\n\t\t\tair_range = 50\n\t\t}\n', ''),
    );
  });

  it('deletes the whole named block, leaving the rest byte-identical', async () => {
    await deleteVia({
      entityName: 'artillery_equipment',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    expect(await readFile(filePath, 'utf8')).toBe(
      FIXTURE.replace(
        '\tartillery_equipment = {\n\t\tis_archetype = yes\n\t\ttype = artillery\n\t\treliability = 0.5\n\t}\n',
        '',
      ),
    );
  });

  it('rejects with 404 when the entity is absent', async () => {
    await expect(
      writeVia({
        deltas: [{ added: [], block: null, changed: [], removed: [] }],
        entityName: 'tank_equipment',
        modId: MOD_ID,
        relativePath: RELATIVE_PATH,
      }),
    ).rejects.toSatisfy((error) => extractIpcError(error).code === 404);
  });

  it('rejects with 409 when a changed key is absent from the block', async () => {
    await expect(
      writeVia({
        deltas: [
          {
            added: [],
            block: null,
            changed: [{ key: 'unknown_field', value: '1' }],
            removed: [],
          },
        ],
        entityName: 'infantry_equipment',
        modId: MOD_ID,
        relativePath: RELATIVE_PATH,
      }),
    ).rejects.toSatisfy((error) => extractIpcError(error).code === 409);
  });

  it('rejects with 409 when a removed key is absent from the block', async () => {
    await expect(
      writeVia({
        deltas: [
          { added: [], block: null, changed: [], removed: ['unknown_field'] },
        ],
        entityName: 'infantry_equipment',
        modId: MOD_ID,
        relativePath: RELATIVE_PATH,
      }),
    ).rejects.toSatisfy((error) => extractIpcError(error).code === 409);
  });

  it('rejects with 409 when an added key already exists in the block', async () => {
    await expect(
      writeVia({
        deltas: [
          {
            added: [{ key: 'reliability', value: '0.9' }],
            block: null,
            changed: [],
            removed: [],
          },
        ],
        entityName: 'infantry_equipment',
        modId: MOD_ID,
        relativePath: RELATIVE_PATH,
      }),
    ).rejects.toSatisfy((error) => extractIpcError(error).code === 409);
  });

  it('rejects with 409 when a removed key is absent from a named child block', async () => {
    await expect(
      writeVia({
        deltas: [
          {
            added: [],
            block: ['add_stats'],
            changed: [],
            removed: ['unknown_stat'],
          },
        ],
        entityName: 'engine_module',
        modId: MOD_ID,
        relativePath: RELATIVE_PATH,
      }),
    ).rejects.toSatisfy((error) => extractIpcError(error).code === 409);
  });

  it('rejects with 409 when a changed key targets an absent child block', async () => {
    await expect(
      writeVia({
        deltas: [
          {
            added: [],
            block: ['add_stats'],
            changed: [{ key: 'air_attack', value: '7' }],
            removed: [],
          },
        ],
        entityName: 'armor_module',
        modId: MOD_ID,
        relativePath: RELATIVE_PATH,
      }),
    ).rejects.toSatisfy((error) => extractIpcError(error).code === 409);
  });

  it('rejects with 403 when the target is under a readonly source', async () => {
    state.sources = [{ path: modRoot, permission: 'readonly' }];

    await expect(
      writeVia({
        deltas: [
          {
            added: [],
            block: null,
            changed: [{ key: 'reliability', value: '0.9' }],
            removed: [],
          },
        ],
        entityName: 'infantry_equipment',
        modId: MOD_ID,
        relativePath: RELATIVE_PATH,
      }),
    ).rejects.toSatisfy((error) => extractIpcError(error).code === 403);
  });

  it('applies a root + named-child batch against one snapshot, reconciling the offset shift of an earlier removal against a later block edit', async () => {
    await writeVia({
      deltas: [
        {
          added: [],
          block: null,
          changed: [{ key: 'reliability', value: '0.85' }],
          removed: ['max_organisation'],
        },
        {
          added: [],
          block: ['modules'],
          changed: [{ key: 'slot', value: 'no' }],
          removed: [],
        },
      ],
      entityName: 'infantry_equipment',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    expect(await readFile(filePath, 'utf8')).toBe(
      FIXTURE.replace('reliability = 0.8\n', 'reliability = 0.85\n')
        .replace('\t\tmax_organisation = 60\n', '')
        .replace('slot = yes', 'slot = no'),
    );
  });

  it('creates one child block and drops another within a single batch', async () => {
    await writeVia({
      deltas: [
        {
          added: [],
          block: ['add_stats'],
          changed: [],
          removed: ['air_range', 'reliability'],
        },
        {
          added: [{ key: 'air_attack', value: '1' }],
          block: ['remove_stats'],
          changed: [],
          removed: [],
        },
      ],
      entityName: 'engine_module',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    expect(await readFile(filePath, 'utf8')).toBe(
      FIXTURE.replace(
        '\t\tadd_stats = {\n\t\t\t# tuned for range\n\t\t\tair_range = 100\n\t\t\treliability = 0.4\n\t\t}\n',
        '',
      ).replace(
        '\t\tname = engine\n\t}',
        '\t\tname = engine\n\t\tremove_stats = {\n\t\t\tair_attack = 1\n\t\t}\n\t}',
      ),
    );
  });

  it('writes nothing when any delta in the batch fails, leaving the file byte-identical (atomicity)', async () => {
    await expect(
      writeVia({
        deltas: [
          {
            added: [],
            block: null,
            changed: [{ key: 'reliability', value: '0.85' }],
            removed: [],
          },
          {
            added: [],
            block: null,
            changed: [{ key: 'unknown_field', value: '1' }],
            removed: [],
          },
        ],
        entityName: 'infantry_equipment',
        modId: MOD_ID,
        relativePath: RELATIVE_PATH,
      }),
    ).rejects.toSatisfy((error) => extractIpcError(error).code === 409);

    expect(await readFile(filePath, 'utf8')).toBe(FIXTURE);
  });

  it('applies a single-element batch identically to the equivalent standalone delta', async () => {
    await writeVia({
      deltas: [
        {
          added: [{ key: 'cost', value: '10' }],
          block: null,
          changed: [{ key: 'reliability', value: '0.9' }],
          removed: ['max_organisation'],
        },
      ],
      entityName: 'infantry_equipment',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    expect(await readFile(filePath, 'utf8')).toBe(
      FIXTURE.replace('reliability = 0.8', 'reliability = 0.9')
        .replace('\t\tmax_organisation = 60\n', '')
        .replace(
          '\t\t}\n\t}\n\tartillery_equipment',
          '\t\t}\n\t\tcost = 10\n\t}\n\tartillery_equipment',
        ),
    );
  });

  it('rejects with 400 when the batch is empty', async () => {
    await expect(
      writeVia({
        deltas: [],
        entityName: 'infantry_equipment',
        modId: MOD_ID,
        relativePath: RELATIVE_PATH,
      }),
    ).rejects.toSatisfy((error) => extractIpcError(error).code === 400);

    expect(await readFile(filePath, 'utf8')).toBe(FIXTURE);
  });
});

const CHARACTER_FIXTURE = `characters = {
\tSome_Leader = {
\t\tname = "NAME_KEY"
\t\tportraits = {
\t\t\tarmy = {
\t\t\t\tlarge = "gfx/large.dds"
\t\t\t\tsmall = "gfx/small.dds"
\t\t\t}
\t\t}
\t\tcorps_commander = {
\t\t\tskill = 4
\t\t\ttraits = {
\t\t\t\ttrait_one
\t\t\t\ttrait_two
\t\t\t}
\t\t}
\t\tadvisor = {
\t\t\tslot = political_advisor
\t\t\tcan_be_fired = no
\t\t}
\t}
}
`;

describe('registerEntityHandlers — grandchild path scope and value lists', () => {
  beforeEach(async () => {
    vi.mocked(ipcMain.handle).mockReset();

    modRoot = await mkdtemp(path.join(tmpdir(), 'zmt-character-'));
    filePath = path.join(modRoot, RELATIVE_PATH);
    await writeFile(filePath, CHARACTER_FIXTURE);

    state.sources = [{ path: modRoot, permission: 'editable' }];
    state.workspace = {
      includedMods: [
        { id: MOD_ID, name: 'mod', path: modRoot, permission: 'editable' },
      ],
    };

    registerEntityHandlers();
  });

  afterEach(async () => {
    await rm(modRoot, { force: true, recursive: true });
  });

  it('patches a grandchild scalar via a two-element path, leaving siblings byte-identical', async () => {
    await writeVia({
      deltas: [
        {
          added: [],
          block: ['portraits', 'army'],
          changed: [{ key: 'large', value: '"gfx/new.dds"' }],
          removed: [],
        },
      ],
      entityName: 'Some_Leader',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    expect(await readFile(filePath, 'utf8')).toBe(
      CHARACTER_FIXTURE.replace('"gfx/large.dds"', '"gfx/new.dds"'),
    );
  });

  it('adds a bare value-list token at depth two without an `= value`', async () => {
    await writeVia({
      deltas: [
        {
          added: [{ key: 'trait_three', value: null }],
          block: ['corps_commander', 'traits'],
          changed: [],
          removed: [],
        },
      ],
      entityName: 'Some_Leader',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    expect(await readFile(filePath, 'utf8')).toBe(
      CHARACTER_FIXTURE.replace(
        '\t\t\t\ttrait_two\n',
        '\t\t\t\ttrait_two\n\t\t\t\ttrait_three\n',
      ),
    );
  });

  it('removes a bare value-list token, leaving the surviving tokens byte-identical', async () => {
    await writeVia({
      deltas: [
        {
          added: [],
          block: ['corps_commander', 'traits'],
          changed: [],
          removed: ['trait_one'],
        },
      ],
      entityName: 'Some_Leader',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    expect(await readFile(filePath, 'utf8')).toBe(
      CHARACTER_FIXTURE.replace('\t\t\t\ttrait_one\n', ''),
    );
  });

  it('drops the whole value-list block when its last token is removed', async () => {
    await writeVia({
      deltas: [
        {
          added: [],
          block: ['corps_commander', 'traits'],
          changed: [],
          removed: ['trait_one', 'trait_two'],
        },
      ],
      entityName: 'Some_Leader',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    expect(await readFile(filePath, 'utf8')).toBe(
      CHARACTER_FIXTURE.replace(
        '\t\t\ttraits = {\n\t\t\t\ttrait_one\n\t\t\t\ttrait_two\n\t\t\t}\n',
        '',
      ),
    );
  });

  it('edits two coexisting roles independently in one atomic batch', async () => {
    await writeVia({
      deltas: [
        {
          added: [],
          block: ['corps_commander'],
          changed: [{ key: 'skill', value: '5' }],
          removed: [],
        },
        {
          added: [],
          block: ['advisor'],
          changed: [{ key: 'can_be_fired', value: 'yes' }],
          removed: [],
        },
      ],
      entityName: 'Some_Leader',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    expect(await readFile(filePath, 'utf8')).toBe(
      CHARACTER_FIXTURE.replace('skill = 4', 'skill = 5').replace(
        'can_be_fired = no',
        'can_be_fired = yes',
      ),
    );
  });

  it('rejects with 409 when an intermediate path segment is absent', async () => {
    await expect(
      writeVia({
        deltas: [
          {
            added: [{ key: 'large', value: '"gfx/x.dds"' }],
            block: ['portraits', 'navy'],
            changed: [{ key: 'large', value: '"gfx/x.dds"' }],
            removed: [],
          },
        ],
        entityName: 'Some_Leader',
        modId: MOD_ID,
        relativePath: RELATIVE_PATH,
      }),
    ).rejects.toSatisfy((error) => extractIpcError(error).code === 409);
  });
});

const CHARACTER_INSTANCE_FIXTURE = `characters = {
\tDLC_Leader = {
\t\tname = "DLC_NAME"
\t\tcorps_commander = {
\t\t\tskill = 4
\t\t}
\t\tinstance = {
\t\t\tdlc = "First Pack"
\t\t\tcountry_leader = {
\t\t\t\tideology = neutrality
\t\t\t}
\t\t}
\t\tinstance = {
\t\t\tdlc = "Second Pack"
\t\t\tcountry_leader = {
\t\t\t\tideology = fascism
\t\t\t}
\t\t}
\t}
}
`;

// Instance DLC unwrap (ZMT-E21): an instance-nested role saves back inside its
// `instance` wrapper via the indexed segment, leaving the wrapper's `dlc` condition
// and every other instance byte-identical; a top-level role still saves at the root.
describe('registerEntityHandlers — instance DLC wrapper write-back', () => {
  beforeEach(async () => {
    vi.mocked(ipcMain.handle).mockReset();

    modRoot = await mkdtemp(path.join(tmpdir(), 'zmt-instance-'));
    filePath = path.join(modRoot, RELATIVE_PATH);
    await writeFile(filePath, CHARACTER_INSTANCE_FIXTURE);

    state.sources = [{ path: modRoot, permission: 'editable' }];
    state.workspace = {
      includedMods: [
        { id: MOD_ID, name: 'mod', path: modRoot, permission: 'editable' },
      ],
    };

    registerEntityHandlers();
  });

  afterEach(async () => {
    await rm(modRoot, { force: true, recursive: true });
  });

  it('patches a role inside the second instance via the indexed segment, leaving the dlc condition, the first instance, and the top-level role byte-identical', async () => {
    await writeVia({
      deltas: [
        {
          added: [],
          block: [{ index: 1, name: 'instance' }, 'country_leader'],
          changed: [{ key: 'ideology', value: 'despotism' }],
          removed: [],
        },
      ],
      entityName: 'DLC_Leader',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    expect(await readFile(filePath, 'utf8')).toBe(
      CHARACTER_INSTANCE_FIXTURE.replace(
        '\t\t\t\tideology = fascism\n',
        '\t\t\t\tideology = despotism\n',
      ),
    );
  });

  it('patches the role inside the first instance independently of the second', async () => {
    await writeVia({
      deltas: [
        {
          added: [],
          block: [{ index: 0, name: 'instance' }, 'country_leader'],
          changed: [{ key: 'ideology', value: 'democratic' }],
          removed: [],
        },
      ],
      entityName: 'DLC_Leader',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    expect(await readFile(filePath, 'utf8')).toBe(
      CHARACTER_INSTANCE_FIXTURE.replace(
        '\t\t\t\tideology = neutrality\n',
        '\t\t\t\tideology = democratic\n',
      ),
    );
  });

  it('saves a top-level role at the character root, leaving both instances byte-identical', async () => {
    await writeVia({
      deltas: [
        {
          added: [],
          block: ['corps_commander'],
          changed: [{ key: 'skill', value: '6' }],
          removed: [],
        },
      ],
      entityName: 'DLC_Leader',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    expect(await readFile(filePath, 'utf8')).toBe(
      CHARACTER_INSTANCE_FIXTURE.replace('skill = 4', 'skill = 6'),
    );
  });
});

const TECHNOLOGY_FIXTURE = `technologies = {
\tinfantry_weapons = {
\t\tresearch_cost = 2
\t\tpath = {
\t\t\tleads_to_tech = infantry_weapons1
\t\t\tresearch_cost_coeff = 1
\t\t}
\t\tfolder = {
\t\t\tname = infantry_folder
\t\t\tposition = {
\t\t\t\tx = 0
\t\t\t\ty = 0
\t\t\t}
\t\t}
\t\tpath = {
\t\t\tleads_to_tech = infantry_at
\t\t\tresearch_cost_coeff = 2
\t\t}
\t\tcategories = {
\t\t\tinfantry_tech
\t\t}
\t}
}
`;

// Indexed scope segments (ADR 019, amended ZMT-14): a `{ name, index }` segment
// addresses the index-th of N repeated same-name blocks. The fixture interleaves
// `path … folder … path` to exercise non-contiguity.
describe('registerEntityHandlers — indexed scope for repeated same-name blocks', () => {
  beforeEach(async () => {
    vi.mocked(ipcMain.handle).mockReset();

    modRoot = await mkdtemp(path.join(tmpdir(), 'zmt-technology-'));
    filePath = path.join(modRoot, RELATIVE_PATH);
    await writeFile(filePath, TECHNOLOGY_FIXTURE);

    state.sources = [{ path: modRoot, permission: 'editable' }];
    state.workspace = {
      includedMods: [
        { id: MOD_ID, name: 'mod', path: modRoot, permission: 'editable' },
      ],
    };

    registerEntityHandlers();
  });

  afterEach(async () => {
    await rm(modRoot, { force: true, recursive: true });
  });

  it('patches the second path block via an indexed segment, leaving the interleaved folder and the first path byte-identical', async () => {
    await writeVia({
      deltas: [
        {
          added: [],
          block: [{ index: 1, name: 'path' }],
          changed: [{ key: 'leads_to_tech', value: 'infantry_at2' }],
          removed: [],
        },
      ],
      entityName: 'infantry_weapons',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    expect(await readFile(filePath, 'utf8')).toBe(
      TECHNOLOGY_FIXTURE.replace(
        'leads_to_tech = infantry_at\n',
        'leads_to_tech = infantry_at2\n',
      ),
    );
  });

  it('patches a folder nested-object leaf via an indexed segment plus a nested name', async () => {
    await writeVia({
      deltas: [
        {
          added: [],
          block: [{ index: 0, name: 'folder' }, 'position'],
          changed: [{ key: 'x', value: '5' }],
          removed: [],
        },
      ],
      entityName: 'infantry_weapons',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    expect(await readFile(filePath, 'utf8')).toBe(
      TECHNOLOGY_FIXTURE.replace('x = 0', 'x = 5'),
    );
  });

  it('materializes a new repeated block when the indexed segment is past the sibling count', async () => {
    await writeVia({
      deltas: [
        {
          added: [
            { key: 'leads_to_tech', value: 'infantry_radio' },
            { key: 'research_cost_coeff', value: '3' },
          ],
          block: [{ index: 2, name: 'path' }],
          changed: [],
          removed: [],
        },
      ],
      entityName: 'infantry_weapons',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    const written = await readFile(filePath, 'utf8');
    const entity = blockAtPath(written, ['technologies', 'infantry_weapons']);
    const paths = entity?.children.filter(
      (child) =>
        child.kind === 'Assignment' &&
        (child.key.kind === 'Identifier' ? child.key.name : child.key.value) ===
          'path',
    );
    expect(paths).toHaveLength(3);
    // The first two repeated blocks survive verbatim; the new one is appended.
    expect(written).toContain('leads_to_tech = infantry_weapons1');
    expect(written).toContain('leads_to_tech = infantry_at');
    expect(written).toContain('leads_to_tech = infantry_radio');
  });

  it('drops the addressed repeated block when its fields are all removed, leaving the other path and the folder intact', async () => {
    await writeVia({
      deltas: [
        {
          added: [],
          block: [{ index: 1, name: 'path' }],
          changed: [],
          removed: ['leads_to_tech', 'research_cost_coeff'],
        },
      ],
      entityName: 'infantry_weapons',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    expect(await readFile(filePath, 'utf8')).toBe(
      TECHNOLOGY_FIXTURE.replace(
        '\t\tpath = {\n\t\t\tleads_to_tech = infantry_at\n\t\t\tresearch_cost_coeff = 2\n\t\t}\n',
        '',
      ),
    );
  });

  it('still rejects a duplicate scalar key in a property bag (relaxation is object-list-only)', async () => {
    await expect(
      writeVia({
        deltas: [
          {
            added: [{ key: 'research_cost', value: '4' }],
            block: null,
            changed: [],
            removed: [],
          },
        ],
        entityName: 'infantry_weapons',
        modId: MOD_ID,
        relativePath: RELATIVE_PATH,
      }),
    ).rejects.toSatisfy((error) => extractIpcError(error).code === 409);
  });
});

// Parses `source` and descends the named-block path, returning the block at the
// end of the path. Params are deeply-readonly (string + string path) so the
// helper stays clear of P-1's mutable-AST-node parameter bar; the mutable parser
// nodes are touched only through locals.
function blockAtPath(
  source: string,
  path: readonly string[],
): BlockNode | undefined {
  let children: readonly BlockChild[] = parse(source, {
    dialects: [],
  }).children;
  let block: BlockNode | undefined;
  for (const key of path) {
    block = undefined;
    for (const child of children) {
      if (child.kind !== 'Assignment' || child.value.kind !== 'Block') continue;
      const name =
        child.key.kind === 'Identifier' ? child.key.name : child.key.value;
      if (name === key) {
        block = child.value;
        break;
      }
    }
    if (block === undefined) return undefined;
    children = block.children;
  }
  return block;
}

// Pins the bare-token vs empty-string-scalar serialization asymmetry (ZMT-13.1,
// A-TS-1) end to end: a delta is serialized by the write path, then re-parsed, so
// the assertions are on AST shape — locale-independent (R-CODE-7).
describe('registerEntityHandlers — bare-token vs empty-string scalar round-trip', () => {
  beforeEach(async () => {
    vi.mocked(ipcMain.handle).mockReset();

    modRoot = await mkdtemp(path.join(tmpdir(), 'zmt-roundtrip-'));
    filePath = path.join(modRoot, RELATIVE_PATH);
    await writeFile(filePath, CHARACTER_FIXTURE);

    state.sources = [{ path: modRoot, permission: 'editable' }];
    state.workspace = {
      includedMods: [
        { id: MOD_ID, name: 'mod', path: modRoot, permission: 'editable' },
      ],
    };

    registerEntityHandlers();
  });

  afterEach(async () => {
    await rm(modRoot, { force: true, recursive: true });
  });

  it('round-trips a bare value-list token (absent value) as a bare token, never a `key = ""` scalar', async () => {
    await writeVia({
      deltas: [
        {
          added: [{ key: 'trait_three', value: null }],
          block: ['corps_commander', 'traits'],
          changed: [],
          removed: [],
        },
      ],
      entityName: 'Some_Leader',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    const written = await readFile(filePath, 'utf8');
    const traits = blockAtPath(written, [
      'characters',
      'Some_Leader',
      'corps_commander',
      'traits',
    ]);
    const token = traits?.children.find(
      (child) => child.kind === 'Identifier' && child.name === 'trait_three',
    );

    expect(token).toBeDefined();
    // A bare token parses as a value node, not a key/value Assignment.
    expect(token?.kind).toBe('Identifier');
  });

  it('round-trips an empty-string scalar as `key = ""`, distinct from a bare token', async () => {
    await writeVia({
      deltas: [
        {
          added: [{ key: 'description', value: '' }],
          block: ['corps_commander'],
          changed: [],
          removed: [],
        },
      ],
      entityName: 'Some_Leader',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    const written = await readFile(filePath, 'utf8');
    expect(written).toContain('description = ""');

    const corps = blockAtPath(written, [
      'characters',
      'Some_Leader',
      'corps_commander',
    ]);
    const scalar = corps?.children.find(
      (child) =>
        child.kind === 'Assignment' &&
        (child.key.kind === 'Identifier' ? child.key.name : child.key.value) ===
          'description',
    );

    // The empty string survives as a key/value Assignment whose value is the
    // empty string — not a bare token, not a dropped field.
    expect(scalar?.kind).toBe('Assignment');
    if (scalar?.kind === 'Assignment' && scalar.value.kind === 'StringValue') {
      expect(scalar.value.value).toBe('');
    }
  });
});

// Intermediate-block materialization (ADR 019, amended ZMT-15): an added-only
// delta whose scope has an absent INTERMEDIATE block materializes the missing
// tail (nesting rendered blocks down the path) before the add. The state fixture
// has no `buildings` block, so `['buildings', '14']` (a per-province building
// object) is an absent intermediate; a changed/removed delta against the same
// missing target still conflicts.
const STATE_FIXTURE = `state = {
\tid = 1
\tname = "STATE_1"
\tprovinces = {
\t\t1 2 3
\t}
\thistory = {
\t\towner = GER
\t\tcontroller = GER
\t\tvictory_points = { 100 5 }
\t}
}
`;

describe('registerEntityHandlers — intermediate-block materialization', () => {
  beforeEach(async () => {
    vi.mocked(ipcMain.handle).mockReset();

    modRoot = await mkdtemp(path.join(tmpdir(), 'zmt-state-'));
    filePath = path.join(modRoot, RELATIVE_PATH);
    await writeFile(filePath, STATE_FIXTURE);

    state.sources = [{ path: modRoot, permission: 'editable' }];
    state.workspace = {
      includedMods: [
        { id: MOD_ID, name: 'mod', path: modRoot, permission: 'editable' },
      ],
    };

    registerEntityHandlers();
  });

  afterEach(async () => {
    await rm(modRoot, { force: true, recursive: true });
  });

  it('materializes the absent intermediate block then the leaf for an added-only delta', async () => {
    await writeVia({
      deltas: [
        {
          added: [{ key: 'naval_base', value: '4' }],
          block: ['buildings', '14'],
          changed: [],
          removed: [],
        },
      ],
      entityName: 'state',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    const written = await readFile(filePath, 'utf8');
    const buildings = blockAtPath(written, ['state', 'buildings']);
    const province = blockAtPath(written, ['state', 'buildings', '14']);

    expect(buildings).toBeDefined();
    expect(province).toBeDefined();
    expect(written).toContain('\t\t\tnaval_base = 4\n');
    // The rest of the file is byte-identical: only the new block is inserted.
    expect(written).toContain('victory_points = { 100 5 }');
  });

  it('coalesces a shared absent intermediate across the batch into exactly one buildings block', async () => {
    await writeVia({
      deltas: [
        {
          added: [{ key: 'arms_factory', value: '2' }],
          block: ['buildings'],
          changed: [],
          removed: [],
        },
        {
          added: [{ key: 'naval_base', value: '4' }],
          block: ['buildings', '14'],
          changed: [],
          removed: [],
        },
      ],
      entityName: 'state',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    const written = await readFile(filePath, 'utf8');
    const stateBlock = blockAtPath(written, ['state']);
    const buildingsBlocks = stateBlock?.children.filter(
      (child) =>
        child.kind === 'Assignment' &&
        (child.key.kind === 'Identifier' ? child.key.name : child.key.value) ===
          'buildings',
    );
    // Exactly ONE buildings block, not one per delta — this is the coalescing
    // guarantee (ADR 019, amended ZMT-15.1). The state-wide building scalar and the
    // per-province object both nest inside the one materialized buildings block.
    expect(buildingsBlocks).toHaveLength(1);

    const province = blockAtPath(written, ['state', 'buildings', '14']);
    expect(province).toBeDefined();
    expect(written).toContain('\t\tarms_factory = 2\n');
    expect(written).toContain('\t\t\tnaval_base = 4\n');
    // The rest of the file is untouched.
    expect(written).toContain('victory_points = { 100 5 }');
  });

  it('materializes a single block when only the terminal segment is absent (regression)', async () => {
    await writeVia({
      deltas: [
        {
          added: [{ key: 'infrastructure', value: '3' }],
          block: ['buildings'],
          changed: [],
          removed: [],
        },
      ],
      entityName: 'state',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    const written = await readFile(filePath, 'utf8');
    const buildings = blockAtPath(written, ['state', 'buildings']);

    expect(buildings).toBeDefined();
    expect(written).toContain('\t\tinfrastructure = 3\n');
  });

  it('rejects with 409 when a changed delta targets an absent intermediate block', async () => {
    await expect(
      writeVia({
        deltas: [
          {
            added: [],
            block: ['buildings', '14'],
            changed: [{ key: 'naval_base', value: '4' }],
            removed: [],
          },
        ],
        entityName: 'state',
        modId: MOD_ID,
        relativePath: RELATIVE_PATH,
      }),
    ).rejects.toSatisfy((error) => extractIpcError(error).code === 409);

    expect(await readFile(filePath, 'utf8')).toBe(STATE_FIXTURE);
  });

  it('rejects with 409 when a removed delta targets an absent intermediate block', async () => {
    await expect(
      writeVia({
        deltas: [
          {
            added: [],
            block: ['buildings', '14'],
            changed: [],
            removed: ['naval_base'],
          },
        ],
        entityName: 'state',
        modId: MOD_ID,
        relativePath: RELATIVE_PATH,
      }),
    ).rejects.toSatisfy((error) => extractIpcError(error).code === 409);

    expect(await readFile(filePath, 'utf8')).toBe(STATE_FIXTURE);
  });
});

// Batch-coalesced materialization at a DEEPER absent prefix (ADR 019, amended
// ZMT-15.1): the shared absent block is a grandchild of a present parent, not a
// top-level child. Two added-only deltas sharing that prefix must still
// materialize it once. `present` exists; `present -> absent` does not.
const NESTED_FIXTURE = `root = {
\tpresent = {
\t\tkeep = 1
\t}
}
`;

describe('registerEntityHandlers — coalescing a deeper shared absent prefix', () => {
  beforeEach(async () => {
    vi.mocked(ipcMain.handle).mockReset();

    modRoot = await mkdtemp(path.join(tmpdir(), 'zmt-nested-'));
    filePath = path.join(modRoot, RELATIVE_PATH);
    await writeFile(filePath, NESTED_FIXTURE);

    state.sources = [{ path: modRoot, permission: 'editable' }];
    state.workspace = {
      includedMods: [
        { id: MOD_ID, name: 'mod', path: modRoot, permission: 'editable' },
      ],
    };

    registerEntityHandlers();
  });

  afterEach(async () => {
    await rm(modRoot, { force: true, recursive: true });
  });

  it('materializes a shared absent grandchild once for two deltas, nesting both leaves', async () => {
    await writeVia({
      deltas: [
        {
          added: [{ key: 'x', value: '1' }],
          block: ['present', 'absent', 'first'],
          changed: [],
          removed: [],
        },
        {
          added: [{ key: 'y', value: '2' }],
          block: ['present', 'absent', 'second'],
          changed: [],
          removed: [],
        },
      ],
      entityName: 'root',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    const written = await readFile(filePath, 'utf8');
    const present = blockAtPath(written, ['root', 'present']);
    const absentBlocks = present?.children.filter(
      (child) =>
        child.kind === 'Assignment' &&
        (child.key.kind === 'Identifier' ? child.key.name : child.key.value) ===
          'absent',
    );
    expect(absentBlocks).toHaveLength(1);

    const first = blockAtPath(written, ['root', 'present', 'absent', 'first']);
    const second = blockAtPath(written, [
      'root',
      'present',
      'absent',
      'second',
    ]);
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(written).toContain('x = 1');
    expect(written).toContain('y = 2');
    // The pre-existing scalar in the present parent is untouched.
    expect(written).toContain('keep = 1');
  });
});

// Numeric assignment keys (the per-province `<id> = { … }` building objects)
// round-trip through the write path now that the grammar admits NumberValue keys
// (ZMT-15, ZMT-E16): a province id is a numeric BLOCK key descended into for an inner
// change/add, or dropped by a parent-scoped key removal; building levels inside it
// are scalars targeted surgically.
const STATE_PROVINCE_FIXTURE = `state = {
\tid = 5
\tbuildings = {
\t\tinfrastructure = 3
\t\t14 = {
\t\t\tnaval_base = 4
\t\t}
\t\t27 = {
\t\t\tcoastal_bunker = 2
\t\t}
\t}
}
`;

describe('registerEntityHandlers — numeric province-id keys round-trip', () => {
  beforeEach(async () => {
    vi.mocked(ipcMain.handle).mockReset();

    modRoot = await mkdtemp(path.join(tmpdir(), 'zmt-province-'));
    filePath = path.join(modRoot, RELATIVE_PATH);
    await writeFile(filePath, STATE_PROVINCE_FIXTURE);

    state.sources = [{ path: modRoot, permission: 'editable' }];
    state.workspace = {
      includedMods: [
        { id: MOD_ID, name: 'mod', path: modRoot, permission: 'editable' },
      ],
    };

    registerEntityHandlers();
  });

  afterEach(async () => {
    await rm(modRoot, { force: true, recursive: true });
  });

  it('changes a building level within an existing province at the numeric-keyed path', async () => {
    await writeVia({
      deltas: [
        {
          added: [],
          block: ['buildings', '14'],
          changed: [{ key: 'naval_base', value: '5' }],
          removed: [],
        },
      ],
      entityName: 'state',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    expect(await readFile(filePath, 'utf8')).toBe(
      STATE_PROVINCE_FIXTURE.replace('naval_base = 4', 'naval_base = 5'),
    );
  });

  it('removes one province entry with a parent-scoped key removal, leaving the sibling byte-identical', async () => {
    await writeVia({
      deltas: [
        {
          added: [],
          block: ['buildings'],
          changed: [],
          removed: ['14'],
        },
      ],
      entityName: 'state',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    expect(await readFile(filePath, 'utf8')).toBe(
      STATE_PROVINCE_FIXTURE.replace(
        '\t\t14 = {\n\t\t\tnaval_base = 4\n\t\t}\n',
        '',
      ),
    );
  });

  it('adds a building into an existing province object', async () => {
    await writeVia({
      deltas: [
        {
          added: [{ key: 'coastal_bunker', value: '2' }],
          block: ['buildings', '14'],
          changed: [],
          removed: [],
        },
      ],
      entityName: 'state',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    expect(await readFile(filePath, 'utf8')).toBe(
      STATE_PROVINCE_FIXTURE.replace(
        '\t\t\tnaval_base = 4\n',
        '\t\t\tnaval_base = 4\n\t\t\tcoastal_bunker = 2\n',
      ),
    );
  });
});

// Keyed-object-map editing (ADR 018, amended ZMT-18): a subideology map (`types`)
// under a wrapper-nested ideology entity. The entity block is located by name via
// the BFS descent, so the `ideologies` wrapper is transparent. An add-only delta
// at `['types', <k>]` materializes `<k> = { … }`; an EMPTY add-only delta
// materializes the bodyless `<k> = { }`; a removal is a parent-scoped key removal
// that drops the whole sub-block; unmodeled blocks (`color`) ride through.
const IDEOLOGY_FIXTURE = `ideologies = {
\tdemocratic = {
\t\twar_impact_on_world_tension = 0.5
\t\ttypes = {
\t\t\tliberalism = {
\t\t\t\tpolitical_power_factor = 0.075
\t\t\t}
\t\t\tconservatism = {
\t\t\t}
\t\t}
\t\tcolor = { 0 100 200 }
\t}
\tneutrality = {
\t\tcolor = { 80 80 80 }
\t}
}
`;

describe('registerEntityHandlers — keyed-object-map editing (ideology types)', () => {
  beforeEach(async () => {
    vi.mocked(ipcMain.handle).mockReset();

    modRoot = await mkdtemp(path.join(tmpdir(), 'zmt-ideology-'));
    filePath = path.join(modRoot, RELATIVE_PATH);
    await writeFile(filePath, IDEOLOGY_FIXTURE);

    state.sources = [{ path: modRoot, permission: 'editable' }];
    state.workspace = {
      includedMods: [
        { id: MOD_ID, name: 'mod', path: modRoot, permission: 'editable' },
      ],
    };

    registerEntityHandlers();
  });

  afterEach(async () => {
    await rm(modRoot, { force: true, recursive: true });
  });

  it('materializes a bodyless subideology for an empty added-only delta', async () => {
    await writeVia({
      deltas: [
        {
          added: [],
          block: ['types', 'vanguardism'],
          changed: [],
          removed: [],
        },
      ],
      entityName: 'democratic',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    const written = await readFile(filePath, 'utf8');
    const vanguardism = blockAtPath(written, [
      'ideologies',
      'democratic',
      'types',
      'vanguardism',
    ]);
    expect(vanguardism).toBeDefined();
    expect(vanguardism?.children).toHaveLength(0);
    // The unmodeled color block rides through untouched.
    expect(written).toContain('color = { 0 100 200 }');
  });

  it('materializes a subideology with a scalar body', async () => {
    await writeVia({
      deltas: [
        {
          added: [{ key: 'political_power_factor', value: '0.05' }],
          block: ['types', 'socialism'],
          changed: [],
          removed: [],
        },
      ],
      entityName: 'democratic',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    const written = await readFile(filePath, 'utf8');
    const socialism = blockAtPath(written, [
      'ideologies',
      'democratic',
      'types',
      'socialism',
    ]);
    expect(socialism).toBeDefined();
    expect(written).toContain('political_power_factor = 0.05');
  });

  it('drops a whole subideology sub-block via a parent-scoped key removal', async () => {
    await writeVia({
      deltas: [
        {
          added: [],
          block: ['types'],
          changed: [],
          removed: ['conservatism'],
        },
      ],
      entityName: 'democratic',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    const written = await readFile(filePath, 'utf8');
    const types = blockAtPath(written, ['ideologies', 'democratic', 'types']);
    const names = types?.children
      .filter((child) => child.kind === 'Assignment')
      .map((child) =>
        child.kind === 'Assignment' && child.key.kind === 'Identifier'
          ? child.key.name
          : '',
      );
    expect(names).toEqual(['liberalism']);
    expect(written).toContain('color = { 0 100 200 }');
  });

  it('materializes the absent types intermediate for a bodyless add', async () => {
    await writeVia({
      deltas: [
        {
          added: [],
          block: ['types', 'monarchism'],
          changed: [],
          removed: [],
        },
      ],
      entityName: 'neutrality',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    const written = await readFile(filePath, 'utf8');
    const monarchism = blockAtPath(written, [
      'ideologies',
      'neutrality',
      'types',
      'monarchism',
    ]);
    expect(monarchism).toBeDefined();
    expect(monarchism?.children).toHaveLength(0);
    expect(written).toContain('color = { 80 80 80 }');
  });
});
