import { OBJECT_LIST_ITEM_INDEX_KEY } from '@r-core';
import { describe, expect, it } from 'vitest';

import {
  collectSymbolReplacements,
  TechnologySnapshot,
} from './technology-delta.util';

function folderValues(
  position: Readonly<Record<string, string>>,
  name = 'F',
): Readonly<Record<string, unknown>> {
  return {
    folder: [{ name, [OBJECT_LIST_ITEM_INDEX_KEY]: 0, position }],
    research_cost: '5',
  };
}

// A snapshot whose root `research_cost` and folder `position.x` were authored as
// `@`-substitution constants (each field carries `symbol`), while `position.y`
// and the folder `name` are plain literals.
function snapshot(): TechnologySnapshot {
  return {
    lists: [],
    objectLists: [
      {
        fieldKeys: ['name'],
        items: [
          {
            nested: [
              { key: 'x', symbol: { name: 'FTR_START' }, value: '-5' },
              { key: 'y', value: '100' },
            ],
            scalars: [{ key: 'name', value: 'F' }],
          },
        ],
        name: 'folder',
        nested: { fieldKeys: ['x', 'y'], name: 'position' },
      },
    ],
    root: [{ key: 'research_cost', symbol: { name: 'COST' }, value: '5' }],
    rootKeys: ['research_cost'],
  };
}

describe('collectSymbolReplacements (ADR 022 write-side warning)', () => {
  it('reports every changed symbolic field with its replacing literal', () => {
    const replacements = collectSymbolReplacements(snapshot(), {
      folder: [
        { name: 'F', [OBJECT_LIST_ITEM_INDEX_KEY]: 0, position: { x: '10', y: '100' } },
      ],
      research_cost: '9',
    });

    expect(replacements).toHaveLength(2);
    expect(replacements).toEqual(
      expect.arrayContaining([
        { literal: '9', name: 'COST' },
        { literal: '10', name: 'FTR_START' },
      ]),
    );
  });

  it('reports nothing when no symbolic field changed', () => {
    // x and research_cost keep their resolved values; only a plain field moves.
    expect(
      collectSymbolReplacements(snapshot(), folderValues({ x: '-5', y: '100' }, 'RENAMED')),
    ).toEqual([]);
  });

  it('does not report a changed NON-symbolic field', () => {
    // y (a plain literal) changes; no symbol was ever bound there.
    expect(
      collectSymbolReplacements(snapshot(), folderValues({ x: '-5', y: '250' })),
    ).toEqual([]);
  });

  it('reports the symbolic field when it alone changes', () => {
    expect(
      collectSymbolReplacements(snapshot(), folderValues({ x: '42', y: '100' })),
    ).toEqual([{ literal: '42', name: 'FTR_START' }]);
  });
});
