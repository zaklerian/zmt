import type {
  LocalisationEntry,
  TechnologyDeletePlan,
  TechnologyDeleteTarget,
} from '@contracts';

import { describe, expect, it } from 'vitest';

import {
  buildTechnologyDeleteOperations,
  technologyDeleteLocKeys,
} from './technology-delete.util';

// ZMT-52 regression gates 1, 3 and 5 on the renderer half: what a delete SENDS.
// The main-side spec (`entity-mutation.delete.spec.ts`) proves the same wire
// shape lands atomically on disk; the two meet at this contract, which is what
// makes the loop end-to-end without an Electron binary between them.

const AIR_PATH = 'common/technologies/air_techs.txt';
const ENGINE_PATH = 'common/technologies/electronic_mechanical_engineering.txt';
const LOC_PATH = 'localisation/english/research_l_english.yml';
const OTHER_LOC_PATH = 'localisation/english/bi_mio_l_english.yml';

function entry(
  key: string,
  overrides: Partial<LocalisationEntry> = {},
): LocalisationEntry {
  return {
    key,
    permission: 'editable',
    target: { modId: 'bice', relativePath: LOC_PATH },
    value: key,
    version: '0',
    ...overrides,
  };
}

function plan(
  targets: readonly TechnologyDeleteTarget[],
): TechnologyDeletePlan {
  return { blocked: [], inboundReferences: [], targets };
}

function target(
  token: string,
  relativePath = AIR_PATH,
): TechnologyDeleteTarget {
  return { modId: 'bice', relativePath, token };
}

describe('technologyDeleteLocKeys', () => {
  it('asks for the name key and both derived keys of every removed token', () => {
    expect(
      technologyDeleteLocKeys(
        plan([target('early_fighter'), target('fighter2')]),
      ),
    ).toEqual([
      'early_fighter',
      'early_fighter_desc',
      'early_fighter_short',
      'fighter2',
      'fighter2_desc',
      'fighter2_short',
    ]);
  });
});

describe('buildTechnologyDeleteOperations', () => {
  // Gate 1 — the item delete: one block, its present loc keys, one batch.
  it('removes the block and the loc keys that exist (gate 1)', () => {
    const operations = buildTechnologyDeleteOperations(
      plan([target('early_fighter')]),
      [entry('early_fighter'), entry('early_fighter_desc')],
    );

    expect(operations).toEqual([
      {
        entityNames: ['early_fighter'],
        format: 'scriptDelete',
        modId: 'bice',
        relativePath: AIR_PATH,
      },
      {
        deltas: [
          { key: 'early_fighter', kind: 'delete' },
          { key: 'early_fighter_desc', kind: 'delete' },
        ],
        format: 'loc',
        modId: 'bice',
        relativePath: LOC_PATH,
      },
    ]);
  });

  // Gate 5 — the same-file constraint ZMT-50/51 flagged. Two technologies in one
  // file are ONE operation with an ordered list, never two operations that
  // `assertOneOperationPerFile` would reject.
  it('composes same-file deletes as one ordered per-file operation (gate 5)', () => {
    const operations = buildTechnologyDeleteOperations(
      plan([target('early_fighter'), target('fighter2'), target('fighter3')]),
      [],
    );

    expect(operations).toEqual([
      {
        entityNames: ['early_fighter', 'fighter2', 'fighter3'],
        format: 'scriptDelete',
        modId: 'bice',
        relativePath: AIR_PATH,
      },
    ]);
  });

  it('emits one operation per file for a set spanning files (gate 4)', () => {
    const operations = buildTechnologyDeleteOperations(
      plan([
        target('early_fighter'),
        target('tech_air_engine_jet', ENGINE_PATH),
        target('fighter2'),
      ]),
      [],
    );

    expect(operations).toEqual([
      {
        entityNames: ['early_fighter', 'fighter2'],
        format: 'scriptDelete',
        modId: 'bice',
        relativePath: AIR_PATH,
      },
      {
        entityNames: ['tech_air_engine_jet'],
        format: 'scriptDelete',
        modId: 'bice',
        relativePath: ENGINE_PATH,
      },
    ]);
  });

  it('groups loc deletes by their own owning file', () => {
    const operations = buildTechnologyDeleteOperations(
      plan([target('early_fighter'), target('fighter2')]),
      [
        entry('early_fighter'),
        entry('fighter2', {
          target: { modId: 'bice', relativePath: OTHER_LOC_PATH },
        }),
      ],
    );

    expect(
      operations.filter((operation) => operation.format === 'loc'),
    ).toEqual([
      {
        deltas: [{ key: 'early_fighter', kind: 'delete' }],
        format: 'loc',
        modId: 'bice',
        relativePath: LOC_PATH,
      },
      {
        deltas: [{ key: 'fighter2', kind: 'delete' }],
        format: 'loc',
        modId: 'bice',
        relativePath: OTHER_LOC_PATH,
      },
    ]);
  });

  // The canvas's own folder: none of the 35 base `air_techs_folder` technologies
  // owns a BICE loc key (ZMT-50 grounding §4), so its deletes are script-only.
  it('emits no loc operation when the removed set owns no editable key', () => {
    const operations = buildTechnologyDeleteOperations(
      plan([target('early_fighter')]),
      [],
    );

    expect(operations.every((operation) => operation.format !== 'loc')).toBe(
      true,
    );
  });

  it('skips a key whose only definition is vanilla-owned', () => {
    const operations = buildTechnologyDeleteOperations(
      plan([target('early_fighter')]),
      [entry('early_fighter', { permission: 'readonly', target: null })],
    );

    expect(operations.every((operation) => operation.format !== 'loc')).toBe(
      true,
    );
  });

  // Gate 3 — the warning is a report, not an instruction. Nothing in the emitted
  // batch touches a technology outside the deleted set.
  it('never emits an operation for an inbound referrer (gate 3)', () => {
    const operations = buildTechnologyDeleteOperations(
      {
        blocked: [],
        inboundReferences: [
          { referencedTokens: ['early_fighter'], token: 'interceptor1' },
        ],
        targets: [target('early_fighter')],
      },
      [],
    );

    expect(operations).toEqual([
      {
        entityNames: ['early_fighter'],
        format: 'scriptDelete',
        modId: 'bice',
        relativePath: AIR_PATH,
      },
    ]);
  });
});
