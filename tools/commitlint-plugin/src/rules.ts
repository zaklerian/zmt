import type { RuleOutcome } from '@commitlint/types';

import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';

import { parseMessage, requiresMultiLineBody, TICKET, ticketOfBranch } from './grammar.ts';

export interface CommitLike {
  readonly body?: string | null;
  readonly footer?: string | null;
  readonly header?: string | null;
  readonly raw?: string | null;
}

export interface GitContext {
  readonly branch: string;
  readonly projectRoots: readonly string[];
  readonly stagedFiles: readonly string[];
}

function git(args: readonly string[]): string {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

function lines(text: string): readonly string[] {
  return text.split('\n').filter((line) => line.length > 0);
}

export function readGitContext(): GitContext {
  return {
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD']).trim(),
    projectRoots: lines(git(['ls-files', '--', 'project.json', '*/project.json'])).map((file) =>
      dirname(file),
    ),
    stagedFiles: lines(git(['diff', '--cached', '--name-only'])),
  };
}

function rawOf(commit: CommitLike): string {
  return commit.raw ?? [commit.header, commit.body, commit.footer].filter(Boolean).join('\n');
}

export function ticketHeader(
  commit: CommitLike,
  _when?: unknown,
  context?: GitContext,
): RuleOutcome {
  const { header } = parseMessage(rawOf(commit));
  if (!TICKET.test(header)) {
    return [
      false,
      `first line must be the ticket ID alone, e.g. ZMT-A-2 (PROC-2); got "${header}"`,
    ];
  }
  const branch = (context ?? readGitContext()).branch;
  const ticket = ticketOfBranch(branch);
  if (ticket === null) {
    return [false, `branch "${branch}" does not match dev|hotfix/ZMT-A-<N> (PROC-1)`];
  }
  if (ticket !== header) {
    return [false, `commit ticket ${header} differs from branch ticket ${ticket} (PROC-3)`];
  }
  return [true];
}

export function bodySymbols(commit: CommitLike): RuleOutcome {
  const { malformed } = parseMessage(rawOf(commit));
  if (malformed.length > 0) {
    return [
      false,
      `body lines start with "+ ", "- ", "* ", "~ " or "! ", and trailers follow a blank line (PROC-2): ${malformed.join(' | ')}`,
    ];
  }
  return [true];
}

export function bodyShape(commit: CommitLike, _when?: unknown, context?: GitContext): RuleOutcome {
  const { body } = parseMessage(rawOf(commit));
  const { projectRoots, stagedFiles } = context ?? readGitContext();
  if (stagedFiles.length === 0) {
    return [true];
  }
  const wide = requiresMultiLineBody(stagedFiles, projectRoots);
  if (wide && body.length === 0) {
    return [
      false,
      `the staged diff spans more than one area or more than five files: use a multi-line body (Option B, PROC-10)`,
    ];
  }
  if (!wide && body.length > 0) {
    return [false, `the staged diff is narrow: use the single ticket line (Option A, PROC-10)`];
  }
  return [true];
}
