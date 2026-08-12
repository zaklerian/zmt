import { IPC_ERROR_CODES } from '@contracts';
import { describe, expect, it } from 'vitest';

import type { AstInsertDelta } from './ast-scoped-delta.strategy';

import { applyAstDelta } from './ast-scoped-delta.strategy';

// ADR 027 decision 4 / regression gate 2 (closes ledger L-012): the AST strategy's
// `insert` delta must produce a new named block BYTE-IDENTICAL to the same block
// hand-authored in place — indentation, brace placement, and trailing newline. This
// is proven against a real-shape technology block (nested `folder` with an inline
// `position`, a bare-token `categories` list, `@`-symbol values), not asserted. The
// strategy is pure, so this needs no fs and no Electron binary.

const l = (...lines: readonly string[]): string => lines.join('\n');

// A real-shape technology block, as a modder would hand-author it inside the
// `technologies = { … }` parent.
const HAND_AUTHORED_TEST_TECH = l(
  '\ttest_tech = {',
  '\t\tresearch_cost = 2',
  '\t\tstart_year = 1936',
  '\t\tfolder = {',
  '\t\t\tname = air_techs_folder',
  '\t\t\tposition = { x = @FTR_COL y = @1936 }',
  '\t\t}',
  '\t\tcategories = {',
  '\t\t\tair_equipment',
  '\t\t}',
  '\t}',
);

// The same block expressed as an insert delta: scoped added-fields rooted at the
// new block name. A null `block` is the block's own scalars; a scoped `block` nests
// one named child deeper (the Add action compiles to exactly this shape).
const TEST_TECH_INSERT: AstInsertDelta = {
  body: [
    {
      added: [
        { key: 'research_cost', value: '2' },
        { key: 'start_year', value: '1936' },
      ],
      block: null,
      changed: [],
      removed: [],
    },
    {
      added: [
        { key: 'name', value: 'air_techs_folder' },
        { key: 'position', value: '{ x = @FTR_COL y = @1936 }' },
      ],
      block: ['folder'],
      changed: [],
      removed: [],
    },
    {
      added: [{ key: 'air_equipment', value: null }],
      block: ['categories'],
      changed: [],
      removed: [],
    },
  ],
  kind: 'insert',
  name: 'test_tech',
  parentName: 'technologies',
};

describe('ast-scoped-delta strategy — insert (ADR 027 decision 4, closes L-012)', () => {
  it('inserts a new block byte-identically to the same block hand-authored in place', () => {
    const source = l(
      'technologies = {',
      '\texisting_tech = {',
      '\t\tresearch_cost = 1',
      '\t}',
      '}',
      '',
    );
    const expected = l(
      'technologies = {',
      '\texisting_tech = {',
      '\t\tresearch_cost = 1',
      '\t}',
      HAND_AUTHORED_TEST_TECH,
      '}',
      '',
    );

    expect(applyAstDelta(source, TEST_TECH_INSERT, [])).toBe(expected);
  });

  it('inserts into an empty parent block byte-identically', () => {
    const source = l('technologies = {', '}', '');
    const expected = l('technologies = {', HAND_AUTHORED_TEST_TECH, '}', '');

    expect(applyAstDelta(source, TEST_TECH_INSERT, [])).toBe(expected);
  });

  it('rejects inserting a block whose name already exists in the parent (CONFLICT)', () => {
    const source = l(
      'technologies = {',
      '\ttest_tech = {',
      '\t\tresearch_cost = 1',
      '\t}',
      '}',
      '',
    );

    expect(() => applyAstDelta(source, TEST_TECH_INSERT, [])).toThrow(
      expect.objectContaining({ code: IPC_ERROR_CODES.CONFLICT }),
    );
  });

  it('rejects an insert whose parent block does not exist (NOT_FOUND)', () => {
    const source = l('equipments = {', '}', '');

    expect(() => applyAstDelta(source, TEST_TECH_INSERT, [])).toThrow(
      expect.objectContaining({ code: IPC_ERROR_CODES.NOT_FOUND }),
    );
  });
});
