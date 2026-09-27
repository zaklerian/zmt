import {
  areaOf,
  parseMessage,
  parsePushRefs,
  pushProblems,
  requiresMultiLineBody,
  ticketOfBranch,
} from './grammar.ts';

const ROOTS = [
  'apps/renderer',
  'libs/shared/i18n',
  'libs/renderer/shell/feature',
  'tools/eslint-rules',
];

describe('ticketOfBranch', () => {
  it('extracts the ticket from dev and hotfix branches', () => {
    expect(ticketOfBranch('dev/ZMT-A-2')).toBe('ZMT-A-2');
    expect(ticketOfBranch('hotfix/ZMT-A-17')).toBe('ZMT-A-17');
    expect(ticketOfBranch('dev/ZMT-A-3.1')).toBe('ZMT-A-3.1');
  });

  it('rejects any other branch', () => {
    expect(ticketOfBranch('main')).toBeNull();
    expect(ticketOfBranch('feature/ZMT-A-2')).toBeNull();
    expect(ticketOfBranch('dev/ZMT-A-2-extra')).toBeNull();
    expect(ticketOfBranch('dev/zmt-a-2')).toBeNull();
  });
});

describe('parseMessage', () => {
  it('splits header, symbol body and trailer block', () => {
    const message = parseMessage(
      'ZMT-A-2\n+ added a\n- removed b\n* changed c\n~ fixed d\n! broke e\n\nCo-Authored-By: X <x@y.z>\n',
    );
    expect(message.header).toBe('ZMT-A-2');
    expect(message.body).toHaveLength(5);
    expect(message.trailers).toEqual(['Co-Authored-By: X <x@y.z>']);
    expect(message.malformed).toEqual([]);
  });

  it('flags body lines without a symbol prefix and loose trailer text', () => {
    const message = parseMessage('ZMT-A-2\n+ ok\nplain line\n\nnot a trailer');
    expect(message.malformed).toEqual(['plain line', 'not a trailer']);
  });

  it('requires a space after the symbol', () => {
    expect(parseMessage('ZMT-A-2\n+added').malformed).toEqual(['+added']);
  });

  it('ignores git comment lines and trailing blank lines', () => {
    const message = parseMessage('ZMT-A-2\r\n# Please enter the commit message\r\n\r\n\r\n');
    expect(message).toEqual({ body: [], header: 'ZMT-A-2', malformed: [], trailers: [] });
  });
});

describe('areaOf', () => {
  it('maps files to their owning Nx project', () => {
    expect(areaOf('libs/renderer/shell/feature/src/lib/x.ts', ROOTS)).toBe(
      'libs/renderer/shell/feature',
    );
    expect(areaOf('apps/renderer/project.json', ROOTS)).toBe('apps/renderer');
  });

  it('maps other files to their top-level area', () => {
    expect(areaOf('docs/ledger.md', ROOTS)).toBe('docs');
    expect(areaOf('.claude/rules/arch.md', ROOTS)).toBe('.claude');
    expect(areaOf('package.json', ROOTS)).toBe('workspace');
    expect(areaOf('tools/scripts/check.mjs', ROOTS)).toBe('tools/scripts');
  });
});

describe('requiresMultiLineBody (PROC-10)', () => {
  it('is false for up to five files inside one area', () => {
    expect(
      requiresMultiLineBody(
        ['libs/shared/i18n/src/a.ts', 'libs/shared/i18n/src/b.ts', 'libs/shared/i18n/project.json'],
        ROOTS,
      ),
    ).toBe(false);
  });

  it('is true for more than five files', () => {
    const files = Array.from({ length: 6 }, (_, index) => `docs/file-${String(index)}.md`);
    expect(requiresMultiLineBody(files, ROOTS)).toBe(true);
  });

  it('is true when two areas are touched', () => {
    expect(requiresMultiLineBody(['docs/ledger.md', '.claude/rules/proc.md'], ROOTS)).toBe(true);
  });
});

describe('pushProblems (PROC-1)', () => {
  const refs = parsePushRefs('refs/heads/dev/ZMT-A-2 abc refs/heads/dev/ZMT-A-2 def\n');

  it('accepts a ticket branch pushed to itself', () => {
    expect(pushProblems('dev/ZMT-A-2', refs)).toEqual([]);
  });

  it('rejects a non-ticket local branch', () => {
    expect(pushProblems('feature/x', refs)).toHaveLength(1);
  });

  it('rejects pushes to main and to non-ticket remote branches', () => {
    const problems = pushProblems(
      'dev/ZMT-A-2',
      parsePushRefs('HEAD abc refs/heads/main def\nHEAD abc refs/heads/wip def\n'),
    );
    expect(problems).toHaveLength(2);
    expect(problems[0]).toMatch(/main/u);
  });

  it('ignores tag pushes and malformed lines', () => {
    expect(
      pushProblems('dev/ZMT-A-2', parsePushRefs('refs/tags/v1 a refs/tags/v1 b\ngarbage')),
    ).toEqual([]);
  });
});
