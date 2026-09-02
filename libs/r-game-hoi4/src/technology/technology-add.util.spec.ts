import { EntityBlockDelta } from '@contracts';
import { EntityFormLocalisationContext } from '@r-core';
import { describe, expect, it } from 'vitest';

import {
  buildTechnologyAddOperations,
  resolveTechnologyAddToken,
  TECHNOLOGY_PARENT_BLOCK,
} from './technology-add.util';

// ZMT-51 regression gate 3 (autogen + collision) and the renderer half of gate 4
// (the atomic insert batch's SHAPE). The main-side half — that this shape really
// lands both files or neither — is
// `apps/electron/src/main/fs/entity-mutation.insert.spec.ts`.

const BODY: readonly EntityBlockDelta[] = [
  {
    added: [{ key: 'start_year', value: '1940' }],
    block: null,
    changed: [],
    removed: [],
  },
];

const TARGET = {
  modId: 'bice',
  relativePath: 'common/technologies/air_techs.txt',
};

function localisation(
  defaultTarget: EntityFormLocalisationContext['defaultTarget'],
  defaultTargetSeedLanguage: null | string = null,
): EntityFormLocalisationContext {
  return {
    defaultTarget,
    defaultTargetSeedLanguage,
    entries: [],
    takenIds: [],
  };
}

describe('resolveTechnologyAddToken', () => {
  it('autogenerates from the public name when the token field is empty (gate 3)', () => {
    expect(resolveTechnologyAddToken('', 'Interceptor IV', [])).toBe(
      'interceptor_iv',
    );
  });

  it('re-autogenerates from a CLEARED token field — blank is not a token', () => {
    expect(resolveTechnologyAddToken('   ', 'Heavy Fighter', [])).toBe(
      'heavy_fighter',
    );
  });

  it('suffixes past a collision rather than rejecting the name (gate 3)', () => {
    expect(
      resolveTechnologyAddToken('', 'Interceptor IV', ['interceptor_iv']),
    ).toBe('interceptor_iv_2');
    expect(
      resolveTechnologyAddToken('', 'Interceptor IV', [
        'interceptor_iv',
        'interceptor_iv_2',
      ]),
    ).toBe('interceptor_iv_3');
  });

  it("takes a custom token VERBATIM — it is the user's, not a slug to renumber", () => {
    // A collision on a custom token surfaces as the insert strategy's CONFLICT
    // (asserted main-side); silently creating `tech_raf_2` under a name the user
    // deliberately typed is the failure this guards against.
    expect(resolveTechnologyAddToken('tech_raf', 'Royal Air Force', [])).toBe(
      'tech_raf',
    );
    expect(
      resolveTechnologyAddToken('tech_raf', 'Royal Air Force', ['tech_raf']),
    ).toBe('tech_raf');
  });
});

describe('buildTechnologyAddOperations', () => {
  it('emits ONE insert of the block plus ONE insert of its loc name key (gate 4)', () => {
    const operations = buildTechnologyAddOperations({
      body: BODY,
      localisation: localisation({
        modId: 'bice',
        relativePath: 'localisation/english/research_l_english.yml',
      }),
      publicName: 'Interceptor IV',
      seedTarget: false,
      target: TARGET,
      token: 'interceptor_iv',
    });

    expect(operations).toEqual([
      {
        deltas: BODY,
        entityName: 'interceptor_iv',
        format: 'script',
        insertUnder: TECHNOLOGY_PARENT_BLOCK,
        modId: 'bice',
        relativePath: 'common/technologies/air_techs.txt',
      },
      {
        deltas: [
          {
            key: 'interceptor_iv',
            kind: 'insert',
            value: 'Interceptor IV',
            version: '0',
          },
        ],
        format: 'loc',
        modId: 'bice',
        relativePath: 'localisation/english/research_l_english.yml',
      },
    ]);
  });

  it('never emits a loc `set` — a brand-new token owns no key anywhere (L-024)', () => {
    const [, loc] = buildTechnologyAddOperations({
      body: BODY,
      localisation: localisation({
        modId: 'bice',
        relativePath: 'localisation/english/research_l_english.yml',
      }),
      publicName: 'Interceptor IV',
      seedTarget: false,
      target: TARGET,
      token: 'interceptor_iv',
    });

    expect(loc).toMatchObject({ deltas: [{ kind: 'insert' }] });
  });

  it('writes the script alone when the workspace has no editable loc file', () => {
    const operations = buildTechnologyAddOperations({
      body: BODY,
      localisation: localisation(null),
      publicName: 'Interceptor IV',
      seedTarget: false,
      target: TARGET,
      token: 'interceptor_iv',
    });

    expect(operations).toHaveLength(1);
    expect(operations[0]).toMatchObject({ format: 'script' });
  });

  // ZMT-57 regression gates 3 and 4 — the SHAPE a save-target-resolved add commits.
  // That the shape really lands both files or neither, and that a created file
  // rolls back by UNLINK, is `apps/electron/src/main/fs/entity-mutation.create.spec.ts`.
  it('leads with the script CREATE when the target is the user’s chosen file (gate 4)', () => {
    const operations = buildTechnologyAddOperations({
      body: BODY,
      localisation: localisation(null),
      publicName: 'Interceptor IV',
      seedTarget: true,
      target: {
        modId: 'bice',
        relativePath: 'common/technologies/zmt_new.txt',
      },
      token: 'interceptor_iv',
    });

    expect(operations).toEqual([
      {
        format: 'scriptCreate',
        modId: 'bice',
        relativePath: 'common/technologies/zmt_new.txt',
        rootBlocks: [TECHNOLOGY_PARENT_BLOCK],
      },
      {
        deltas: BODY,
        entityName: 'interceptor_iv',
        format: 'script',
        insertUnder: TECHNOLOGY_PARENT_BLOCK,
        modId: 'bice',
        relativePath: 'common/technologies/zmt_new.txt',
      },
    ]);
  });

  it('leads the loc half with its own create when the loc target is chosen (gate 4)', () => {
    const operations = buildTechnologyAddOperations({
      body: BODY,
      localisation: localisation(
        {
          modId: 'bice',
          relativePath: 'localisation/english/zmt_new_l_english.yml',
        },
        'english',
      ),
      publicName: 'Interceptor IV',
      seedTarget: false,
      target: TARGET,
      token: 'interceptor_iv',
    });

    expect(operations.map((operation) => operation.format)).toEqual([
      'script',
      'locCreate',
      'loc',
    ]);
    expect(operations[1]).toEqual({
      format: 'locCreate',
      language: 'english',
      modId: 'bice',
      relativePath: 'localisation/english/zmt_new_l_english.yml',
    });
  });

  it('writes the script alone when no public name was typed — no empty key', () => {
    const operations = buildTechnologyAddOperations({
      body: BODY,
      localisation: localisation({
        modId: 'bice',
        relativePath: 'localisation/english/research_l_english.yml',
      }),
      publicName: '   ',
      seedTarget: false,
      target: TARGET,
      token: 'interceptor_iv',
    });

    expect(operations).toHaveLength(1);
  });
});
