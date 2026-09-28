import type { EntityFormBlock, NamedNestedBlock } from './entity-form-block.model';

import { ENTITY_FORM_BLOCK_KINDS } from './entity-form-block.model';
import { ENTITY_FORM_MODES } from './entity-form.model';
import {
  blockKey,
  buildEntityFormDefaults,
  KEYED_MAP_ENTRY_KEY,
  KEYED_MAP_ENTRY_ROWS,
  namedNestedRendersRows,
  namedNestedRowsBinding,
} from './entity-form.util';
import { FIELD_VALUE_TYPES } from './field-spec.model';

const TAGS: EntityFormBlock = {
  kind: 'listOfScalars',
  label: 'Tags',
  name: 'tags',
  scope: null,
  values: ['a', 'b'],
};

const OPEN_BAG: EntityFormBlock = {
  kind: 'propertyBag',
  members: {
    knownKeys: [],
    mode: 'open',
    name: 'scalars',
    rows: [
      { key: 'cost', value: '2' },
      { key: 'flag', value: null },
    ],
  },
  scope: null,
};

const FIXED_BAG: EntityFormBlock = {
  kind: 'propertyBag',
  members: {
    fields: [
      { label: 'Name', spec: { name: 'name' }, value: 'My mod' },
      { label: 'Version', spec: { name: 'version' }, value: '0.1' },
    ],
    mode: 'fixed',
  },
  scope: null,
};

const PATHS: EntityFormBlock = {
  addLabel: 'Add path',
  fields: [{ label: 'Leads to', spec: { name: 'leads_to_tech' } }],
  itemLabel: 'Path',
  items: [{ leads_to_tech: 'fighter2' }],
  kind: 'objectList',
  name: 'path',
  scope: null,
};

const RULES: NamedNestedBlock = {
  kind: 'namedNested',
  knownKeys: [{ name: 'can_x' }],
  listChildren: [
    { kind: 'listOfScalars', label: 'Traits', name: 'traits', scope: null, values: ['t'] },
  ],
  name: 'rules',
  namedChildren: [
    { knownKeys: [], name: 'allow', rows: [{ key: 'always', value: 'yes' }], scope: ['allow'] },
  ],
  rows: [{ key: 'can_x', value: 'no' }],
  scope: null,
};

describe('blockKey', () => {
  it('keys named blocks by their binding name', () => {
    expect(blockKey(TAGS, 0)).toBe('tags');
    expect(blockKey(OPEN_BAG, 3)).toBe('scalars');
    expect(blockKey(PATHS, 0)).toBe('path');
    expect(blockKey(RULES, 0)).toBe('rules');
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
  it('seeds lists, open bags, fixed fields and object lists under their names', () => {
    expect(buildEntityFormDefaults([TAGS, OPEN_BAG, FIXED_BAG, PATHS])).toEqual({
      name: 'My mod',
      path: [{ leads_to_tech: 'fighter2' }],
      scalars: [
        { key: 'cost', value: '2' },
        { key: 'flag', value: '' },
      ],
      tags: ['a', 'b'],
      version: '0.1',
    });
    expect(buildEntityFormDefaults([])).toEqual({});
  });

  it('copies list and item values so edits never touch the block', () => {
    const values = buildEntityFormDefaults([TAGS, PATHS]);
    expect(values['tags']).not.toBe(TAGS.values);
    expect(values['path']).not.toBe(PATHS.items);
  });

  it('seeds a named nested block with its rows, list children and named children', () => {
    expect(buildEntityFormDefaults([RULES])).toEqual({
      allow: [{ key: 'always', value: 'yes' }],
      rules: [{ key: 'can_x', value: 'no' }],
      traits: ['t'],
    });
  });

  it('seeds an editable keyed map with fixed-field entries beside its own rows', () => {
    const block: NamedNestedBlock = {
      ...RULES,
      editableKeyedMap: {
        addLabel: 'Add',
        entryValue: { fields: [{ label: 'Level', spec: { name: 'level' } }], kind: 'fixedFields' },
        keyLabel: 'Key',
      },
      namedChildren: [
        { knownKeys: [], name: 'arms', rows: [{ key: 'level', value: '3' }], scope: null },
        { knownKeys: [], name: 'farms', rows: [], scope: null },
      ],
    };
    expect(namedNestedRendersRows(block)).toBe(true);
    expect(namedNestedRowsBinding(block)).toBe('rules__rows');
    expect(buildEntityFormDefaults([block])).toEqual({
      rules: [
        { [KEYED_MAP_ENTRY_KEY]: 'arms', level: '3' },
        { [KEYED_MAP_ENTRY_KEY]: 'farms', level: '' },
      ],
      rules__rows: [{ key: 'can_x', value: 'no' }],
      traits: ['t'],
    });
  });

  it('seeds a keyed-map-only block with property-bag entries and no row binding', () => {
    const block: NamedNestedBlock = {
      editableKeyedMap: {
        addLabel: 'Add',
        entryValue: { kind: 'propertyBag', knownKeys: [] },
        keyLabel: 'Key',
      },
      kind: 'namedNested',
      knownKeys: [],
      name: 'types',
      namedChildren: [
        { knownKeys: [], name: 'liberal', rows: [{ key: 'can_x', value: null }], scope: null },
      ],
      rows: [],
      scope: null,
    };
    expect(namedNestedRendersRows(block)).toBe(false);
    expect(buildEntityFormDefaults([block])).toEqual({
      types: [
        {
          [KEYED_MAP_ENTRY_KEY]: 'liberal',
          [KEYED_MAP_ENTRY_ROWS]: [{ key: 'can_x', value: '' }],
        },
      ],
    });
  });
});
