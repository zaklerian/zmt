import lint from '@commitlint/lint';

import { ZMT_PLUGIN } from './plugin.ts';
import { bodyShape, bodySymbols, type CommitLike, type GitContext, ticketHeader } from './rules.ts';

const CONTEXT: GitContext = {
  branch: 'dev/ZMT-A-2',
  projectRoots: ['apps/renderer', 'libs/shared/i18n'],
  stagedFiles: ['libs/shared/i18n/src/lib/en.const.ts'],
};

function commit(raw: string): CommitLike {
  return { raw };
}

describe('zmt/ticket-header', () => {
  it('accepts the branch ticket alone', () => {
    expect(ticketHeader(commit('ZMT-A-2'), 'always', CONTEXT)).toEqual([true]);
  });

  it('rejects free text, a ticket with a subject and a different ticket', () => {
    expect(ticketHeader(commit('bad message'), 'always', CONTEXT)[0]).toBe(false);
    expect(ticketHeader(commit('ZMT-A-2 add workspace'), 'always', CONTEXT)[0]).toBe(false);
    expect(ticketHeader(commit('ZMT-A-3'), 'always', CONTEXT)).toEqual([
      false,
      'commit ticket ZMT-A-3 differs from branch ticket ZMT-A-2 (PROC-3)',
    ]);
  });

  it('rejects commits on a non-ticket branch', () => {
    expect(ticketHeader(commit('ZMT-A-2'), 'always', { ...CONTEXT, branch: 'main' })[0]).toBe(
      false,
    );
  });
});

describe('zmt/body-symbols', () => {
  it('accepts symbol-prefixed lines followed by trailers', () => {
    expect(bodySymbols(commit('ZMT-A-2\n+ a\n* b\n\nCo-Authored-By: A <a@b.c>'))).toEqual([true]);
  });

  it('rejects prose body lines', () => {
    expect(bodySymbols(commit('ZMT-A-2\nAdded the workspace'))[0]).toBe(false);
  });
});

describe('zmt/body-shape', () => {
  it('requires Option A for a narrow diff', () => {
    expect(bodyShape(commit('ZMT-A-2'), 'always', CONTEXT)).toEqual([true]);
    expect(bodyShape(commit('ZMT-A-2\n+ a'), 'always', CONTEXT)[0]).toBe(false);
  });

  it('requires Option B for a wide diff', () => {
    const wide = { ...CONTEXT, stagedFiles: ['apps/renderer/src/main.ts', 'docs/ledger.md'] };
    expect(bodyShape(commit('ZMT-A-2'), 'always', wide)[0]).toBe(false);
    expect(bodyShape(commit('ZMT-A-2\n+ a\n* b'), 'always', wide)).toEqual([true]);
  });

  it('skips the shape check when nothing is staged', () => {
    expect(bodyShape(commit('ZMT-A-2\n+ a'), 'always', { ...CONTEXT, stagedFiles: [] })).toEqual([
      true,
    ]);
  });
});

describe('plugin through @commitlint/lint', () => {
  const rules = { 'zmt/body-symbols': [2, 'always'], 'zmt/ticket-header': [2, 'always'] } as const;

  it('reports a malformed message as invalid', async () => {
    const result = await lint('bad message\nprose', rules, { plugins: { zmt: ZMT_PLUGIN } });
    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.name).sort()).toEqual([
      'zmt/body-symbols',
      'zmt/ticket-header',
    ]);
  });
});
