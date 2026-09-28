import { NotImplementedError } from '@zmt/renderer/pending/util';

import type { EntityFormBlock } from './entity-form-block.model';

import { ENTITY_FORM_BLOCK_KINDS } from './entity-form-block.model';
import { ENTITY_FORM_MODES } from './entity-form.model';
import { blockKey, buildEntityFormDefaults } from './entity-form.util';
import { FIELD_VALUE_TYPES } from './field-spec.model';

const TAGS: EntityFormBlock = {
  kind: 'listOfScalars',
  label: 'Tags',
  name: 'tags',
  scope: null,
  values: [],
};

const OPEN_BAG: EntityFormBlock = {
  kind: 'propertyBag',
  members: { knownKeys: [], mode: 'open', name: 'scalars', rows: [] },
  scope: null,
};

const FIXED_BAG: EntityFormBlock = {
  kind: 'propertyBag',
  members: { fields: [], mode: 'fixed' },
  scope: null,
};

describe('blockKey', () => {
  it('keys named blocks by their binding name', () => {
    expect(blockKey(TAGS, 0)).toBe('tags');
    expect(blockKey(OPEN_BAG, 3)).toBe('scalars');
    expect(
      blockKey(
        {
          addLabel: '',
          fields: [],
          itemLabel: '',
          items: [],
          kind: 'objectList',
          name: 'path',
          scope: null,
        },
        0,
      ),
    ).toBe('path');
    expect(
      blockKey({ kind: 'namedNested', knownKeys: [], name: 'rules', rows: [], scope: null }, 0),
    ).toBe('rules');
  });

  it('keys fixed property bags by their position', () => {
    expect(blockKey(FIXED_BAG, 2)).toBe('fixed-2');
  });
});

describe('closed sets', () => {
  it('names every block kind, field value type and form mode', () => {
    expect(Object.values(ENTITY_FORM_BLOCK_KINDS)).toEqual([
      'listOfScalars',
      'namedNested',
      'objectList',
      'propertyBag',
    ]);
    expect(Object.values(FIELD_VALUE_TYPES)).toEqual(['boolean', 'number', 'string']);
    expect(Object.values(ENTITY_FORM_MODES)).toEqual(['add', 'edit']);
  });
});

describe('buildEntityFormDefaults', () => {
  it('is pending until the form body ships', () => {
    expect(() => buildEntityFormDefaults([TAGS])).toThrow(NotImplementedError);
  });
});
