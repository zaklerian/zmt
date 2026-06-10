import { describe, expect, it } from 'vitest';

import { createRecognizerRegistry } from './recognizer-registry.service';
import { EntityTableData, EntityTableRecognizer } from './recognizer.model';

const emptyData: EntityTableData = { columns: [], defaultSort: [], rows: [] };

function recognizer(
  id: string,
  matches: (filePath: string) => boolean,
): EntityTableRecognizer {
  return { id, load: () => Promise.resolve(emptyData), matches };
}

describe('recognizerRegistry', () => {
  it('returns null when nothing is registered', () => {
    const registry = createRecognizerRegistry();
    expect(registry.recognize('/mod/file.txt')).toBeNull();
  });

  it('returns null when no registered recognizer matches', () => {
    const registry = createRecognizerRegistry();
    registry.register(recognizer('a', (path) => path.endsWith('.a')));
    expect(registry.recognize('/mod/file.b')).toBeNull();
  });

  it('returns the recognizer whose matches() returns true', () => {
    const registry = createRecognizerRegistry();
    const a = recognizer('a', (path) => path.endsWith('.a'));
    registry.register(a);
    expect(registry.recognize('/mod/file.a')).toBe(a);
  });

  it('returns the first registered recognizer when several match', () => {
    const registry = createRecognizerRegistry();
    const first = recognizer('first', () => true);
    const second = recognizer('second', () => true);
    registry.register(first);
    registry.register(second);
    expect(registry.recognize('/mod/file.a')).toBe(first);
  });
});
