import { OBJECT_LIST_ITEM_INDEX_KEY } from '@r-core';
import { describe, expect, it } from 'vitest';

import {
  computeTechnologyDeltas,
  TechnologySnapshot,
} from './technology-delta.util';

const snapshot: TechnologySnapshot = {
  lists: [
    { binding: 'categories', scope: ['categories'], values: ['cat_one'] },
  ],
  objectLists: [
    {
      fieldKeys: ['leads_to_tech', 'research_cost_coeff'],
      items: [
        {
          scalars: [
            { key: 'leads_to_tech', value: 'tech_a' },
            { key: 'research_cost_coeff', value: '1' },
          ],
        },
        {
          scalars: [
            { key: 'leads_to_tech', value: 'tech_b' },
            { key: 'research_cost_coeff', value: '2' },
          ],
        },
      ],
      name: 'path',
    },
    {
      fieldKeys: ['name'],
      items: [
        {
          nested: [
            { key: 'x', value: '0' },
            { key: 'y', value: '0' },
          ],
          scalars: [{ key: 'name', value: 'land_doctrine_folder' }],
        },
      ],
      name: 'folder',
      nested: { fieldKeys: ['x', 'y'], name: 'position' },
    },
  ],
  root: [
    { key: 'research_cost', value: '2' },
    { key: 'start_year', value: '1936' },
  ],
  rootKeys: ['research_cost', 'start_year', 'doctrine'],
};

// The unchanged baseline: every projected surface echoed back verbatim.
const baseline: Readonly<Record<string, unknown>> = {
  categories: ['cat_one'],
  doctrine: '',
  folder: [
    {
      name: 'land_doctrine_folder',
      [OBJECT_LIST_ITEM_INDEX_KEY]: 0,
      position: { x: '0', y: '0' },
    },
  ],
  path: [
    {
      leads_to_tech: 'tech_a',
      [OBJECT_LIST_ITEM_INDEX_KEY]: 0,
      research_cost_coeff: '1',
    },
    {
      leads_to_tech: 'tech_b',
      [OBJECT_LIST_ITEM_INDEX_KEY]: 1,
      research_cost_coeff: '2',
    },
  ],
  research_cost: '2',
  start_year: '1936',
};

describe('computeTechnologyDeltas', () => {
  it('emits nothing when nothing changed', () => {
    expect(computeTechnologyDeltas(snapshot, baseline)).toEqual([]);
  });

  it('addresses the second path block by its index when its field changes', () => {
    const deltas = computeTechnologyDeltas(snapshot, {
      ...baseline,
      path: [
        baseline.path[0 as keyof typeof baseline.path] as unknown,
        {
          leads_to_tech: 'tech_c',
          [OBJECT_LIST_ITEM_INDEX_KEY]: 1,
          research_cost_coeff: '2',
        },
      ],
    });

    expect(deltas).toEqual([
      {
        added: [],
        block: [{ index: 1, name: 'path' }],
        changed: [{ key: 'leads_to_tech', value: 'tech_c' }],
        removed: [],
      },
    ]);
  });

  it('patches a folder nested-object leaf at an indexed + nested path', () => {
    const deltas = computeTechnologyDeltas(snapshot, {
      ...baseline,
      folder: [
        {
          name: 'land_doctrine_folder',
          [OBJECT_LIST_ITEM_INDEX_KEY]: 0,
          position: { x: '5', y: '0' },
        },
      ],
    });

    expect(deltas).toEqual([
      {
        added: [],
        block: [{ index: 0, name: 'folder' }, 'position'],
        changed: [{ key: 'x', value: '5' }],
        removed: [],
      },
    ]);
  });

  it('materializes a new path item past the original count', () => {
    const deltas = computeTechnologyDeltas(snapshot, {
      ...baseline,
      path: [
        ...(baseline.path as unknown[]),
        {
          leads_to_tech: 'tech_new',
          [OBJECT_LIST_ITEM_INDEX_KEY]: null,
          research_cost_coeff: '3',
        },
      ],
    });

    expect(deltas).toEqual([
      {
        added: [
          { key: 'leads_to_tech', value: 'tech_new' },
          { key: 'research_cost_coeff', value: '3' },
        ],
        block: [{ index: 2, name: 'path' }],
        changed: [],
        removed: [],
      },
    ]);
  });

  it('drops a removed path item block by removing its fields', () => {
    const deltas = computeTechnologyDeltas(snapshot, {
      ...baseline,
      path: [baseline.path[0 as keyof typeof baseline.path] as unknown],
    });

    expect(deltas).toEqual([
      {
        added: [],
        block: [{ index: 1, name: 'path' }],
        changed: [],
        removed: ['leads_to_tech', 'research_cost_coeff'],
      },
    ]);
  });

  it('lowers a ref-list add to a bare value-list item', () => {
    const deltas = computeTechnologyDeltas(snapshot, {
      ...baseline,
      categories: ['cat_one', 'cat_two'],
    });

    expect(deltas).toEqual([
      {
        added: [{ key: 'cat_two', value: null }],
        block: ['categories'],
        changed: [],
        removed: [],
      },
    ]);
  });

  it('emits a root scalar change at block null', () => {
    const deltas = computeTechnologyDeltas(snapshot, {
      ...baseline,
      doctrine: 'yes',
    });

    expect(deltas).toEqual([
      {
        added: [{ key: 'doctrine', value: 'yes' }],
        block: null,
        changed: [],
        removed: [],
      },
    ]);
  });
});
