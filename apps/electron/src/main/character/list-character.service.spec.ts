import { IncludedMod, ProjectedSource } from '@contracts';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { listCharacters } from './list-character.service';

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

const CHARACTER_DIR = 'common/characters';

const CHARACTERS_FILE = `characters = {
\tSome_Leader = {
\t\tname = "NAME_KEY"
\t\tcorps_commander = {
\t\t\tskill = 4
\t\t\ttraits = {
\t\t\t\ttrait_one
\t\t\t\ttrait_two
\t\t\t}
\t\t}
\t}
\tNameless = {
\t}
}
`;

let roots: string[] = [];

async function characterSource(): Promise<{
  characterPath: string;
  source: ProjectedSource;
}> {
  const root = await mkdtemp(path.join(tmpdir(), 'zmt-charlist-'));
  roots.push(root);
  await mkdir(path.join(root, CHARACTER_DIR), { recursive: true });
  const characterPath = path.join(root, CHARACTER_DIR, '00_leaders.txt');
  await writeFile(characterPath, CHARACTERS_FILE);
  return { characterPath, source: { path: root, permission: 'editable' } };
}

describe('listCharacters', () => {
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

  it('reads each character, surfacing the token, raw scalars, and roles', async () => {
    const { characterPath, source } = await characterSource();
    state.sources = [source];

    const entities = await listCharacters(characterPath);

    expect(entities.map((entity) => entity.token)).toEqual([
      'Some_Leader',
      'Nameless',
    ]);

    const leader = entities.find((entity) => entity.token === 'Some_Leader');
    // String scalars keep their raw token (quotes) so a save round-trips them.
    expect(leader?.name).toBe('"NAME_KEY"');
    expect(leader?.roles).toEqual([
      {
        bags: [],
        id: 'corps_commander',
        scalars: [{ key: 'skill', value: '4' }],
        traits: ['trait_one', 'trait_two'],
      },
    ]);
  });

  it('surfaces empty root scalars when the source omits them', async () => {
    const { characterPath, source } = await characterSource();
    state.sources = [source];

    const entities = await listCharacters(characterPath);
    const nameless = entities.find((entity) => entity.token === 'Nameless');

    expect(nameless).toMatchObject({
      name: '',
      portraits: [],
      roles: [],
    });
  });
});
