import { IncludedMod, ProjectedSource } from '@contracts';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { listStates } from './list-state.service';

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

const STATE_DIR = 'history/states';

const STATE_FILE = `state = {
\tid = 12
\tname = "STATE_12"
\tresources = {
\t\toil = 5
\t}
\tbuildings = {
\t\tinfrastructure = 3
\t\t14 = {
\t\t\tcoastal_bunker = 2
\t\t\tnaval_base = 4
\t\t}
\t}
\thistory = {
\t\towner = GER
\t\tcontroller = GER
\t\tvictory_points = { 1234 5 }
\t}
\tprovinces = {
\t\t1 2 3
\t}
}
`;

let roots: string[] = [];

async function stateSource(): Promise<{
  source: ProjectedSource;
  statePath: string;
}> {
  const root = await mkdtemp(path.join(tmpdir(), 'zmt-statelist-'));
  roots.push(root);
  await mkdir(path.join(root, STATE_DIR), { recursive: true });
  const statePath = path.join(root, STATE_DIR, '12-STATE.txt');
  await writeFile(statePath, STATE_FILE);
  return { source: { path: root, permission: 'editable' }, statePath };
}

describe('listStates', () => {
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

  it('reads the state under history/states, projecting its maps and thin history', async () => {
    const { source, statePath } = await stateSource();
    state.sources = [source];

    const [entity, ...rest] = await listStates(statePath);

    expect(rest).toEqual([]);
    expect(entity?.id).toBe('12');
    expect(entity?.name).toBe('"STATE_12"');
    expect(entity?.resources).toEqual([{ key: 'oil', value: '5' }]);
    expect(entity?.buildings).toEqual([{ key: 'infrastructure', value: '3' }]);
    expect(entity?.provinceBuildings).toEqual([
      {
        id: '14',
        rows: [
          { key: 'coastal_bunker', value: '2' },
          { key: 'naval_base', value: '4' },
        ],
      },
    ]);
    // victory_points stays out of the thin history projection (R-CODE-5).
    expect(entity?.history).toEqual([
      { key: 'owner', value: 'GER' },
      { key: 'controller', value: 'GER' },
    ]);
    expect(entity?.provinces).toEqual(['1', '2', '3']);
  });
});
