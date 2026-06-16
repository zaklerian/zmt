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
\t\tgender = male
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
