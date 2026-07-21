import { beforeEach, describe, expect, it, vi } from 'vitest';

// ADR 022 regression gate, R3: a symbol-bearing file must survive an UNMODIFIED
// write through entity-mutation.service byte-identically, and editing a
// NON-symbol field must leave the `@NAME` bytes untouched (the anti-corruption
// property the ticket exists to guarantee). The service is driven directly with
// its collaborators mocked, so no Electron binary is needed.

const state = vi.hoisted(() => ({ source: '', written: '' }));

vi.mock('../workspace', () => ({
  workspaceStoreService: {
    get: vi.fn(() => ({ includedMods: [{ id: 'm', path: '/mods/m' }] })),
  },
}));

vi.mock('../plugins', () => ({
  pluginRegistryService: { list: vi.fn(() => []) },
}));

vi.mock('./path-guard.util', () => ({
  assertWritable: vi.fn(async () => undefined),
}));

vi.mock('./write-file.service', () => ({
  writeFileService: {
    writeText: vi.fn(async (_path: string, text: string) => {
      state.written = text;
    }),
  },
}));

vi.mock('node:fs', () => ({
  promises: { readFile: vi.fn(async () => state.source) },
}));

// Imported after the mocks so its collaborators resolve to them.
const { entityMutationService } = await import('./entity-mutation.service');

const SOURCE = [
  '@FTR_START = -5',
  '@1933 = 100',
  'technologies = {',
  '\tinfantry = {',
  '\t\tresearch_cost = 5',
  '\t\tfolder = {',
  '\t\t\tposition = { x = @FTR_START y = @1933 }',
  '\t\t}',
  '\t}',
  '}',
  '',
].join('\n');

const REQUEST = { entityName: 'infantry', modId: 'm', relativePath: 'tech.txt' };

describe('entity-mutation.service — symbol-bearing round-trip (ADR 022, R3)', () => {
  beforeEach(() => {
    state.source = SOURCE;
    state.written = '';
  });

  it('writes a symbol-bearing file byte-identically under an unmodified write', async () => {
    await entityMutationService.write({ ...REQUEST, deltas: [] });
    expect(state.written).toBe(SOURCE);
  });

  it('edits a non-symbol field and leaves every `@NAME` binding intact', async () => {
    await entityMutationService.write({
      ...REQUEST,
      deltas: [
        { added: [], block: null, changed: [{ key: 'research_cost', value: '99' }], removed: [] },
      ],
    });

    expect(state.written).toContain('research_cost = 99');
    // The position symbols were not touched by the edit, so they survive verbatim.
    expect(state.written).toContain('x = @FTR_START');
    expect(state.written).toContain('y = @1933');
    // The definitions survive too.
    expect(state.written).toContain('@FTR_START = -5');
    expect(state.written).toContain('@1933 = 100');
  });
});
