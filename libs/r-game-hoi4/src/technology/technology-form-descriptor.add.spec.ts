import {
  AppApiModel,
  EntityBatchWriteRequest,
  TechnologyEntity,
} from '@contracts';
import {
  EntityFormLocalisationContext,
  EntityFormValues,
  PropertyBagBlock,
} from '@r-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TECHNOLOGY_FORM_DESCRIPTOR } from './technology-form-descriptor';

// ZMT-51 regression gates 1, 3 and 7 — the FORM half of the ADD loop. It asserts
// the exact `EntityBatchWriteRequest` the descriptor emits in add mode; the
// main-side spec (`entity-mutation.insert.spec.ts`) consumes that same shape
// against a real scratch mirror, so the two meet at the wire contract.
//
// The EDIT path's own assertions live in `technology-form-descriptor.spec.ts` and
// are untouched (gate 7): add mode is a projection-context flag, not a rewrite.

const writeBatch = vi.fn();

const LOC_TARGET = {
  modId: 'bice',
  relativePath: 'localisation/english/research_l_english.yml',
};
const TECH_PATH = 'common/technologies/air_techs.txt';

function localisation(
  overrides: Partial<EntityFormLocalisationContext> = {},
): EntityFormLocalisationContext {
  return {
    defaultTarget: LOC_TARGET,
    entries: [],
    takenIds: ['air_superiority'],
    ...overrides,
  };
}

function project(
  subject: TechnologyEntity = seed(),
  localisationContext: EntityFormLocalisationContext = localisation(),
) {
  return TECHNOLOGY_FORM_DESCRIPTOR.project(subject, {
    localisation: localisationContext,
    mode: 'add',
    modId: 'bice',
    relativePath: TECH_PATH,
    translate: (key) => key,
  });
}

// The seeded blank technology the canvas hands the form: empty everywhere except
// the placement it resolved and, for add-as-child, the edge to the invoking tech.
function seed(parentId: null | string = 'air_superiority'): TechnologyEntity {
  return {
    categories: [],
    dependencies: [],
    enableEquipmentModules: [],
    enableEquipments: [],
    enableSubunits: [],
    folders: [
      {
        position: [
          { key: 'x', value: '5' },
          { key: 'y', value: '6' },
        ],
        scalars: [{ key: 'name', value: 'air_techs_folder' }],
      },
    ],
    paths:
      parentId === null
        ? []
        : [{ scalars: [{ key: 'leads_to_tech', value: parentId }] }],
    rootScalars: [{ key: 'start_year', value: '1940' }],
    subTechnologies: [],
    token: '',
    xor: [],
  };
}

// The form's values at save: the seeded placement as rendered, plus what the user
// typed. No `OBJECT_LIST_ITEM_INDEX_KEY` anywhere — every item is new.
function values(overrides: EntityFormValues = {}): EntityFormValues {
  return {
    __publicName: 'Interceptor IV',
    __token: '',
    categories: [],
    dependencies: [],
    enableEquipmentModules: [],
    enableEquipments: [],
    enableSubunits: [],
    folder: [{ name: 'air_techs_folder', position: { x: '5', y: '6' } }],
    path: [{ leads_to_tech: 'air_superiority', research_cost_coeff: '' }],
    start_year: '1940',
    xor: [],
    ...overrides,
  };
}

const operationsOf = (): EntityBatchWriteRequest['operations'] =>
  (writeBatch.mock.calls[0][0] as EntityBatchWriteRequest).operations;

// The `path` object-list deltas of the inserted body — the edge half of the insert.
function pathDeltasOf() {
  const script = operationsOf()[0];
  if (script.format !== 'script') return [];
  return script.deltas.filter((delta) => {
    const segment = delta.block?.[0];
    return typeof segment === 'object' && segment.name === 'path';
  });
}

beforeEach(() => {
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { entity: { writeBatch } } as unknown as AppApiModel,
    writable: true,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('technology form — add mode is the SAME form (ADR 028 decision 5)', () => {
  it('renders the public-name and token fields, both empty, on the root block', () => {
    const root = project().blocks[0] as PropertyBagBlock;
    if (root.members.mode !== 'fixed') return;

    expect(root.members.fields[0]).toEqual({
      label: 'plugin.hoi4:technology.form.fields.publicName',
      spec: { name: '__publicName' },
      value: '',
    });
    expect(root.members.fields[1]).toEqual({
      label: 'plugin.hoi4:technology.form.fields.token',
      spec: { name: '__token' },
      value: '',
    });
  });

  it('seeds start_year from the placement row and the placement into folder.position', () => {
    const root = project().blocks[0] as PropertyBagBlock;
    if (root.members.mode !== 'fixed') return;
    const startYear = root.members.fields.find(
      (field) =>
        field.label === 'plugin.hoi4:technology.form.fields.start_year',
    );

    expect(startYear?.value).toBe('1940');
    expect(project().blocks[2]).toMatchObject({
      items: [{ name: 'air_techs_folder', position: { x: '5', y: '6' } }],
      name: 'folder',
    });
  });

  it('renders no token field on the EDIT path — the token is frozen there', () => {
    const root = TECHNOLOGY_FORM_DESCRIPTOR.project(seed(null), {
      localisation: localisation(),
      modId: 'bice',
      relativePath: TECH_PATH,
      translate: (key) => key,
    }).blocks[0] as PropertyBagBlock;
    if (root.members.mode !== 'fixed') return;

    expect(
      root.members.fields.some((field) => field.spec.name === '__token'),
    ).toBe(false);
  });
});

describe('technology form — the add write is ONE atomic insert batch (gate 1)', () => {
  it('inserts the block under `technologies` with an all-added body', async () => {
    await project().save(values());

    expect(operationsOf()[0]).toEqual({
      deltas: [
        {
          added: [{ key: 'start_year', value: '1940' }],
          block: null,
          changed: [],
          removed: [],
        },
        {
          added: [{ key: 'leads_to_tech', value: 'air_superiority' }],
          block: [{ index: 0, name: 'path' }],
          changed: [],
          removed: [],
        },
        {
          added: [
            { key: 'name', value: 'air_techs_folder' },
            { key: 'position', value: '{ x = 5 y = 6 }' },
          ],
          block: [{ index: 0, name: 'folder' }],
          changed: [],
          removed: [],
        },
      ],
      entityName: 'interceptor_iv',
      format: 'script',
      insertUnder: 'technologies',
      modId: 'bice',
      relativePath: TECH_PATH,
    });
  });

  it('inserts the loc name key in the SAME batch (gate 1)', async () => {
    await project().save(values());

    expect(operationsOf()).toHaveLength(2);
    expect(operationsOf()[1]).toEqual({
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
      relativePath: LOC_TARGET.relativePath,
    });
  });

  it('carries the edge to the invoking technology — the component join (gate 1)', async () => {
    await project().save(values());

    expect(pathDeltasOf()).toEqual([
      {
        added: [{ key: 'leads_to_tech', value: 'air_superiority' }],
        block: [{ index: 0, name: 'path' }],
        changed: [],
        removed: [],
      },
    ]);
  });

  it('writes no path block for a free placement — a disconnected technology', async () => {
    await project(seed(null)).save(values({ path: [] }));

    expect(pathDeltasOf()).toEqual([]);
  });
});

describe('technology form — the add token (gate 3)', () => {
  it('autogenerates from the typed public name', async () => {
    await project().save(values({ __publicName: 'Heavy Fighter III' }));

    expect(operationsOf()[0]).toMatchObject({
      entityName: 'heavy_fighter_iii',
    });
  });

  it('suffixes past a workspace collision', async () => {
    await project(
      seed(),
      localisation({ takenIds: ['air_superiority', 'heavy_fighter'] }),
    ).save(values({ __publicName: 'Heavy Fighter' }));

    expect(operationsOf()[0]).toMatchObject({ entityName: 'heavy_fighter_2' });
    // The loc key follows the resolved token, never the pre-collision one —
    // otherwise the new technology's name key would land on the existing tech.
    expect(operationsOf()[1]).toMatchObject({
      deltas: [{ key: 'heavy_fighter_2' }],
    });
  });

  it('honours a typed token over the autogenerated one', async () => {
    await project().save(values({ __token: 'tech_raf' }));

    expect(operationsOf()[0]).toMatchObject({ entityName: 'tech_raf' });
    expect(operationsOf()[1]).toMatchObject({ deltas: [{ key: 'tech_raf' }] });
  });

  it('re-autogenerates when the token field is cleared', async () => {
    await project().save(values({ __token: '  ' }));

    expect(operationsOf()[0]).toMatchObject({ entityName: 'interceptor_iv' });
  });
});
