import { describe, expect, it } from 'vitest';

import type { CoverageBaseline } from './baseline.model';
import type { CoverageKey } from './grounding.model';

import { diffBaseline, serializeBaseline } from './baseline.util';

function key(
  entityType: CoverageKey['entityType'],
  keyPath: string,
): CoverageKey {
  return { entityType, example: `f.txt:1`, keyPath, occurrences: 1 };
}

const baseline: CoverageBaseline = {
  entities: {
    module: { gui: { count: 1, example: 'a.txt:1' } },
    technology: { sub_technologies: { count: 1, example: 'b.txt:1' } },
  },
  note: '',
};

describe('diffBaseline (the ratchet)', () => {
  it('flags an unmodeled key absent from the baseline as new', () => {
    const found = [key('module', 'gui'), key('technology', 'XOR')];
    const diff = diffBaseline(found, baseline);
    expect(diff.newKeys.map((k) => k.keyPath)).toEqual(['XOR']);
  });

  it('passes when every found key is in the baseline', () => {
    const found = [key('module', 'gui'), key('technology', 'sub_technologies')];
    expect(diffBaseline(found, baseline).newKeys).toEqual([]);
  });

  it('reports a baseline key not seen in the run as stale, never as new', () => {
    const found = [key('module', 'gui')];
    const diff = diffBaseline(found, baseline);
    expect(diff.newKeys).toEqual([]);
    expect(diff.stale).toEqual([
      { entityType: 'technology', keyPath: 'sub_technologies' },
    ]);
  });

  it('scopes a key to its entity type — same path, different type is new', () => {
    const found = [key('character', 'gui')];
    expect(
      diffBaseline(found, baseline).newKeys.map((k) => k.entityType),
    ).toEqual(['character']);
  });
});

describe('serializeBaseline', () => {
  it('sorts entity types and key paths for a readable diff', () => {
    const found = [
      key('technology', 'sub_technologies'),
      key('module', 'gui'),
      key('module', 'can_convert_from'),
    ];
    const serialized = serializeBaseline(found);
    const parsed = JSON.parse(serialized) as CoverageBaseline;
    expect(Object.keys(parsed.entities)).toEqual(['module', 'technology']);
    expect(Object.keys(parsed.entities.module)).toEqual([
      'can_convert_from',
      'gui',
    ]);
    expect(serialized.endsWith('\n')).toBe(true);
  });
});
