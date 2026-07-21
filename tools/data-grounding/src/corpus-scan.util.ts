import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import type { CorpusFile } from './grounding.model';

import { classifyEntityFile } from './entity-type.const';

// The paradox-script surface the tool parses is `.txt` (the recognizers key on
// `.txt`; entity blocks, events, focuses, ideas all live in `.txt`). Localisation
// (`.yml`), images, and the `.mod` descriptor (parsed against a schema, not the
// script grammar) are out of the round-trip surface and are not enumerated here.
const PARSEABLE_EXTENSION = '.txt';

export function scanCorpus(root: string): readonly CorpusFile[] {
  const files: CorpusFile[] = [];
  for (const absolutePath of walk(root)) {
    if (!absolutePath.toLowerCase().endsWith(PARSEABLE_EXTENSION)) continue;
    const relativePath = relative(root, absolutePath).split(sep).join('/');
    files.push({
      absolutePath,
      entityType: classifyEntityFile(relativePath),
      relativePath,
    });
  }
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
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
