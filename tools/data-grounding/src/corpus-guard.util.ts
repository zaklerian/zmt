import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export interface CorpusDiff {
  readonly changed: readonly string[];
  readonly unchanged: boolean;
}

// A content manifest of every file under the corpus root, taken before and after
// the run. Gate 5 ("nothing under the configured root is modified") is *verified*,
// not asserted: the after-manifest is diffed against the before-manifest and any
// added / removed / changed file is reported. Hashing content (not just mtime)
// catches a same-size same-time overwrite.
export type CorpusManifest = ReadonlyMap<string, string>;

export function diffManifests(
  before: CorpusManifest,
  after: CorpusManifest,
): CorpusDiff {
  const changed: string[] = [];
  for (const [path, hash] of before) {
    const now = after.get(path);
    if (now === undefined) changed.push(`removed: ${path}`);
    else if (now !== hash) changed.push(`modified: ${path}`);
  }
  for (const path of after.keys()) {
    if (!before.has(path)) changed.push(`added: ${path}`);
  }
  changed.sort();
  return { changed, unchanged: changed.length === 0 };
}

export function snapshotCorpus(root: string): CorpusManifest {
  const manifest = new Map<string, string>();
  for (const absolutePath of walk(root)) {
    const relativePath = relative(root, absolutePath).split(sep).join('/');
    const hash = createHash('sha256')
      .update(readFileSync(absolutePath))
      .digest('hex');
    manifest.set(relativePath, hash);
  }
  return manifest;
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}
