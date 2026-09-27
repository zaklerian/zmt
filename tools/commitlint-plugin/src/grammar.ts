export const TICKET = /^ZMT-A-\d+(?:\.\d+)?$/u;
export const TICKET_BRANCH = /^(?:dev|hotfix)\/(ZMT-A-\d+(?:\.\d+)?)$/u;
export const BODY_LINE = /^[+\-*~!] \S/u;
export const TRAILER_LINE = /^[A-Za-z][\w-]*: \S/u;
export const MAX_NARROW_FILES = 5;

export interface CommitMessage {
  readonly body: readonly string[];
  readonly header: string;
  readonly malformed: readonly string[];
  readonly trailers: readonly string[];
}

export function ticketOfBranch(branch: string): string | null {
  return TICKET_BRANCH.exec(branch)?.[1] ?? null;
}

export function parseMessage(raw: string): CommitMessage {
  const lines = raw
    .replace(/\r\n/gu, '\n')
    .split('\n')
    .filter((line) => !line.startsWith('#'));
  const last = lines.findLastIndex((line) => line.trim() !== '');
  const [header = '', ...rest] = lines.slice(0, last + 1);
  const blank = rest.findIndex((line) => line.trim() === '');
  const bodyLines = blank === -1 ? rest : rest.slice(0, blank);
  const trailerLines =
    blank === -1 ? [] : rest.slice(blank + 1).filter((line) => line.trim() !== '');
  return {
    body: bodyLines.filter((line) => BODY_LINE.test(line)),
    header: header.trim(),
    malformed: [
      ...bodyLines.filter((line) => !BODY_LINE.test(line)),
      ...trailerLines.filter((line) => !TRAILER_LINE.test(line)),
    ],
    trailers: trailerLines.filter((line) => TRAILER_LINE.test(line)),
  };
}

export function areaOf(path: string, projectRoots: readonly string[]): string {
  const owner = projectRoots
    .filter((root) => path === root || path.startsWith(`${root}/`))
    .sort((a, b) => b.length - a.length)[0];
  if (owner !== undefined) {
    return owner;
  }
  const segments = path.split('/');
  if (segments.length === 1) {
    return 'workspace';
  }
  const [top = '', second = ''] = segments;
  return ['apps', 'libs', 'tools'].includes(top) && segments.length > 2 ? `${top}/${second}` : top;
}

export function requiresMultiLineBody(
  stagedFiles: readonly string[],
  projectRoots: readonly string[],
): boolean {
  const areas = new Set(stagedFiles.map((file) => areaOf(file, projectRoots)));
  return stagedFiles.length > MAX_NARROW_FILES || areas.size > 1;
}

export interface PushRef {
  readonly localRef: string;
  readonly remoteRef: string;
}

export function parsePushRefs(stdin: string): readonly PushRef[] {
  return stdin
    .split('\n')
    .map((line) => line.trim().split(/\s+/u))
    .filter((fields) => fields.length === 4)
    .map(([localRef = '', , remoteRef = '']) => ({ localRef, remoteRef }));
}

export function pushProblems(branch: string, refs: readonly PushRef[]): readonly string[] {
  const branchProblems =
    ticketOfBranch(branch) === null
      ? [`branch "${branch}" does not match dev/ZMT-A-<N> or hotfix/ZMT-A-<N> (PROC-1)`]
      : [];
  const refProblems = refs.flatMap(({ remoteRef }) => {
    const target = remoteRef.replace(/^refs\/heads\//u, '');
    if (target === 'main') {
      return ['pushing to main is not allowed; main changes only through a PR (PROC-1)'];
    }
    if (remoteRef.startsWith('refs/heads/') && ticketOfBranch(target) === null) {
      return [`remote branch "${target}" does not match dev|hotfix/ZMT-A-<N> (PROC-1)`];
    }
    return [];
  });
  return [...branchProblems, ...refProblems];
}
