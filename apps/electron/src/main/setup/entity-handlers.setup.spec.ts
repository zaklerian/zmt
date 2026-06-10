import {
  EntityDeleteRequest,
  EntityWriteRequest,
  IncludedMod,
  IPC_CHANNELS,
  ProjectedSource,
} from '@contracts';
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

  it('patches only the changed field, leaving siblings, nested blocks, and comments byte-identical', async () => {
    await writeVia({
      delta: {
        added: [],
        changed: [{ key: 'reliability', value: '0.9' }],
        removed: [],
      },
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
      delta: {
        added: [{ key: 'cost', value: '10' }],
        changed: [],
        removed: [],
      },
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
      delta: {
        added: [],
        changed: [],
        removed: ['max_organisation'],
      },
      entityName: 'infantry_equipment',
      modId: MOD_ID,
      relativePath: RELATIVE_PATH,
    });

    expect(await readFile(filePath, 'utf8')).toBe(
      FIXTURE.replace('\t\tmax_organisation = 60\n', ''),
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
        delta: { added: [], changed: [], removed: [] },
        entityName: 'tank_equipment',
        modId: MOD_ID,
        relativePath: RELATIVE_PATH,
      }),
    ).rejects.toSatisfy((error) => extractIpcError(error).code === 404);
  });

  it('rejects with 409 when a changed key is absent from the block', async () => {
    await expect(
      writeVia({
        delta: {
          added: [],
          changed: [{ key: 'unknown_field', value: '1' }],
          removed: [],
        },
        entityName: 'infantry_equipment',
        modId: MOD_ID,
        relativePath: RELATIVE_PATH,
      }),
    ).rejects.toSatisfy((error) => extractIpcError(error).code === 409);
  });

  it('rejects with 409 when a removed key is absent from the block', async () => {
    await expect(
      writeVia({
        delta: { added: [], changed: [], removed: ['unknown_field'] },
        entityName: 'infantry_equipment',
        modId: MOD_ID,
        relativePath: RELATIVE_PATH,
      }),
    ).rejects.toSatisfy((error) => extractIpcError(error).code === 409);
  });

  it('rejects with 409 when an added key already exists in the block', async () => {
    await expect(
      writeVia({
        delta: {
          added: [{ key: 'reliability', value: '0.9' }],
          changed: [],
          removed: [],
        },
        entityName: 'infantry_equipment',
        modId: MOD_ID,
        relativePath: RELATIVE_PATH,
      }),
    ).rejects.toSatisfy((error) => extractIpcError(error).code === 409);
  });

  it('rejects with 403 when the target is under a readonly source', async () => {
    state.sources = [{ path: modRoot, permission: 'readonly' }];

    await expect(
      writeVia({
        delta: {
          added: [],
          changed: [{ key: 'reliability', value: '0.9' }],
          removed: [],
        },
        entityName: 'infantry_equipment',
        modId: MOD_ID,
        relativePath: RELATIVE_PATH,
      }),
    ).rejects.toSatisfy((error) => extractIpcError(error).code === 403);
  });
});
