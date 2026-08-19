import type { IncludedMod } from '@contracts';

import { IPC_ERROR_CODES } from '@contracts';
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

const { entityIndexService } = await import('../entity-index');
const { buildTechnologyDeletePlan } = await import(
  './technology-delete-plan.service'
);

const TECHNOLOGY_DIR = 'common/technologies';

// ZMT-52 regression gates 2 and 3 — the SERVER-SIDE half of the confirmation,
// driven end-to-end through the real entity index over a real scratch mod tree.
// The fixture carries BICE's real shape (grounded this ticket): one
// `technologies = { … }` root per file, `@`-var coordinates, a folder's
// technologies spread across two files (`tank_techs_folder` spans 12 in BICE),
// and a technology whose `folder` list starts with a DIFFERENT folder — the case
// `tech_air_engine_jet` really is, and the reason folder membership reads the
// FIRST folder exactly as the slim projector does.
const AIR_FILE = `technologies = {
\t@1936 = 4
\tearly_fighter = {
\t\tresearch_cost = 1
\t\tpath = { leads_to_tech = fighter2 }
\t\tfolder = { name = air_techs_folder position = { x = 3 y = @1936 } }
\t}
\tfighter2 = {
\t\tresearch_cost = 2
\t\tpath = { leads_to_tech = fighter3 }
\t\tdependencies = { engine_prereq }
\t\tfolder = { name = air_techs_folder position = { x = 3 y = 6 } }
\t}
\tengine_prereq = {
\t\tresearch_cost = 1
\t\tfolder = { name = air_techs_folder position = { x = 5 y = 2 } }
\t}
\tinterceptor1 = {
\t\tresearch_cost = 3
\t\tpath = { leads_to_tech = fighter2 }
\t\tfolder = { name = air_techs_folder position = { x = 7 y = 4 } }
\t}
\tnaval_bomber1 = {
\t\tresearch_cost = 1
\t\tdependencies = { fighter3 }
\t\tfolder = { name = air_techs_folder position = { x = 9 y = 8 } }
\t}
}
`;

const ENGINE_FILE = `technologies = {
\tfighter3 = {
\t\tresearch_cost = 4
\t\tfolder = { name = air_techs_folder position = { x = 3 y = 8 } }
\t}
\telectronics_only = {
\t\tresearch_cost = 1
\t\tpath = { leads_to_tech = fighter2 }
\t\tfolder = { name = electronics_folder position = { x = 1 y = 1 } }
\t}
}
`;

let root = '';
let vanillaRoot = '';

describe('buildTechnologyDeletePlan', () => {
  beforeEach(async () => {
    entityIndexService.clear();
    root = await mkdtemp(path.join(tmpdir(), 'zmt-del-plan-'));
    await mkdir(path.join(root, TECHNOLOGY_DIR), { recursive: true });
    await writeFile(path.join(root, TECHNOLOGY_DIR, '00_air.txt'), AIR_FILE);
    await writeFile(
      path.join(root, TECHNOLOGY_DIR, '01_engine.txt'),
      ENGINE_FILE,
    );
    state.mods = [
      { id: 'bice', name: 'bice', path: root, permission: 'editable' },
    ];
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(root, { force: true, recursive: true });
    if (vanillaRoot !== '') {
      await rm(vanillaRoot, { force: true, recursive: true });
      vanillaRoot = '';
    }
  });

  it('reports NOT_FOUND for a technology no source defines', async () => {
    await expect(
      buildTechnologyDeletePlan('no_such_tech'),
    ).rejects.toMatchObject({ code: IPC_ERROR_CODES.NOT_FOUND });
  });

  // Gate 2 — the count the confirmation shows is the set the delete removes.
  it('counts a delete-tree as the root plus its downward closure (gate 2)', async () => {
    const plan = await buildTechnologyDeletePlan('early_fighter');

    expect(plan.item.targets.map((target) => target.token)).toEqual([
      'early_fighter',
    ]);
    expect(plan.tree.targets.map((target) => target.token)).toEqual([
      'early_fighter',
      'fighter2',
      'fighter3',
    ]);
  });

  // THE Q94 REGRESSION GUARD, at the service level. `fighter2` is inside the
  // removed tree and declares `dependencies = { engine_prereq }`. A closure that
  // followed `dependencies` would take `engine_prereq` with it — deleting a
  // technology the target NEEDED rather than one that needed the target.
  it('removes a path successor and leaves a dependencies prerequisite untouched (gate 2)', async () => {
    const plan = await buildTechnologyDeletePlan('early_fighter');
    const removed = plan.tree.targets.map((target) => target.token);

    expect(removed).toContain('fighter3');
    expect(removed).not.toContain('engine_prereq');
  });

  it('gives a leaf an identical item and tree plan — the signal for a plain confirm (gate 2)', async () => {
    const plan = await buildTechnologyDeletePlan('fighter3');

    expect(plan.tree.targets).toEqual(plan.item.targets);
    expect(plan.tree.targets).toHaveLength(1);
  });

  it('carries each removed technology its own owning file, across files (gate 2)', async () => {
    const plan = await buildTechnologyDeletePlan('early_fighter');

    expect(plan.tree.targets).toEqual([
      {
        modId: 'bice',
        relativePath: `${TECHNOLOGY_DIR}/00_air.txt`,
        token: 'early_fighter',
      },
      {
        modId: 'bice',
        relativePath: `${TECHNOLOGY_DIR}/00_air.txt`,
        token: 'fighter2',
      },
      {
        modId: 'bice',
        relativePath: `${TECHNOLOGY_DIR}/01_engine.txt`,
        token: 'fighter3',
      },
    ]);
  });

  it('stops the closure at the folder boundary', async () => {
    const plan = await buildTechnologyDeletePlan('early_fighter');

    // `electronics_only` points INTO the set but sits in another folder, so it is
    // never a descendant — it can only ever be an inbound reference.
    expect(plan.tree.targets.map((target) => target.token)).not.toContain(
      'electronics_only',
    );
  });

  // Gate 3 — inbound detection, computed server-side over EVERY technology in the
  // workspace, including folders the canvas never loaded.
  it('reports the technologies outside the set that reference into it (gate 3)', async () => {
    const plan = await buildTechnologyDeletePlan('early_fighter');

    expect(plan.tree.inboundReferences).toEqual([
      { referencedTokens: ['fighter2'], token: 'electronics_only' },
      { referencedTokens: ['fighter2'], token: 'interceptor1' },
      { referencedTokens: ['fighter3'], token: 'naval_bomber1' },
    ]);
  });

  it('warns per mode — the item plan dangles nothing here, the tree plan three (gate 3)', async () => {
    const plan = await buildTechnologyDeletePlan('early_fighter');

    // Removing the root alone breaks nothing: it is the head of the chain. The
    // tree takes `fighter2` and `fighter3` with it, and THOSE are what the rest of
    // the corpus points at. The confirmation must therefore state the warning for
    // the mode the user is about to pick, not one figure for both.
    expect(plan.item.inboundReferences).toEqual([]);
    expect(plan.tree.inboundReferences).toHaveLength(3);
  });

  it('excludes references that are themselves inside the deleted set (gate 3)', async () => {
    const plan = await buildTechnologyDeletePlan('early_fighter');

    // `early_fighter → fighter2` is a reference into the set from INSIDE it; it
    // cannot dangle, because the referrer is deleted in the same batch.
    expect(
      plan.tree.inboundReferences.map((reference) => reference.token),
    ).not.toContain('early_fighter');
  });

  it('blocks a vanilla-owned technology instead of planning a write into it', async () => {
    vanillaRoot = await mkdtemp(path.join(tmpdir(), 'zmt-del-vanilla-'));
    await mkdir(path.join(vanillaRoot, TECHNOLOGY_DIR), { recursive: true });
    await writeFile(
      path.join(vanillaRoot, TECHNOLOGY_DIR, '00_vanilla.txt'),
      `technologies = {
\tvanilla_only = {
\t\tresearch_cost = 1
\t\tfolder = { name = air_techs_folder position = { x = 0 y = 0 } }
\t}
}
`,
    );
    state.mods = [
      {
        id: 'vanilla',
        name: 'vanilla',
        path: vanillaRoot,
        permission: 'readonly',
      },
      { id: 'bice', name: 'bice', path: root, permission: 'editable' },
    ];
    entityIndexService.clear();

    const plan = await buildTechnologyDeletePlan('vanilla_only');

    expect(plan.item.blocked).toEqual(['vanilla_only']);
    expect(plan.item.targets).toEqual([]);
  });
});
