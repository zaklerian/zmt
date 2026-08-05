import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import type { CorpusFile } from './grounding.model';

import { classifyEntityFile } from './entity-type.const';

// The paradox-script surface the tool parses. `.txt` carries entity blocks,
// events, focuses, ideas; `.gfx` carries sprite declarations (ZMT-39) and is the
// same script grammar (ZMT-37: `.gfx` parses with 0 errors), so it joins the
// round-trip surface here. Localisation (`.yml`), images, and the `.mod`
// descriptor (parsed against a schema, not the script grammar) stay out.
const PARSEABLE_EXTENSIONS = ['.txt', '.gfx'] as const;

export function scanCorpus(root: string): readonly CorpusFile[] {
  const files: CorpusFile[] = [];
  for (const absolutePath of walk(root)) {
    const lower = absolutePath.toLowerCase();
    if (!PARSEABLE_EXTENSIONS.some((ext) => lower.endsWith(ext))) continue;
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
