import type {
  LocalisationEntry,
  LocalisationLookupResult,
  LocWriteTarget,
} from '@contracts';

import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { IndexSource } from '../entity-index';

import { parseLoc } from '../fs';
import { enumerateLocFiles } from './enumerate-loc-files.util';

// The default localisation language. The PoC reads and writes English; a language
// selector parameterizes this the same way the country switch parameterizes the
// canvas folder. Named here rather than inlined so the seam is one symbol.
export const DEFAULT_LOC_LANGUAGE = 'english';

// Read-only localisation resolution across the workspace's sources (ADR 024's
// load-order rule applied to loc rather than to script): sources in precedence
// order, files within a source by name, LAST DEFINITION WINS. It is pure Node —
// `sources` are passed in, never reached through a store — so it is verifiable
// in-session for the same reason the write boundary is (ADR 027 decision 6).
//
// It answers exactly what the TL edit form needs and nothing more: the current
// value of a key set, the file that owns each, and the file an insert should land
// in. Loc WRITES do not go through here; they ride `entity:writeBatch` so they
// stay atomic with the technology `.txt` edit (ADR 028 decision 1).
//
// UPGRADE PATH: this re-reads every matching loc file per call (a form open).
// Cache it with the entity index's mtime-validity shape ONLY if measured slow —
// the index earned its cache from a per-keystroke read path; this one is per-open.
export interface LocalisationLookupConfig {
  readonly language: string;
  // Lowest → highest precedence, exactly as the entity index resolves them.
  readonly sources: readonly IndexSource[];
}

export async function lookupLocalisation(
  keys: readonly string[],
  config: LocalisationLookupConfig,
): Promise<LocalisationLookupResult> {
  const wanted = new Set(keys);
  const resolved = new Map<string, LocalisationEntry>();
  let defaultTarget: LocWriteTarget | null = null;

  for (const source of config.sources) {
    const files = await enumerateLocFiles(source.path, config.language);
    const target = writeTargetOf(source, files);
    // Later sources outrank earlier ones, so the last editable source that owns a
    // loc file wins the default-insert target — the same precedence the value
    // resolution below uses (ADR 028 decision 6 seam).
    if (target !== null) defaultTarget = target;

    for (const relativePath of files) {
      if (wanted.size === 0) break;
      const absolutePath = path.join(source.path, relativePath);
      let text;
      try {
        text = await fs.readFile(absolutePath, 'utf8');
      } catch {
        continue;
      }
      for (const line of parseLoc(text).lines) {
        if (line.key === null || !wanted.has(line.key)) continue;
        resolved.set(line.key, {
          key: line.key,
          permission: source.permission,
          target:
            source.modId === null
              ? null
              : { modId: source.modId, relativePath },
          value: line.raw.slice(line.valueFrom, line.valueTo),
          version: line.version ?? '',
        });
      }
    }
  }

  return {
    defaultTarget,
    entries: [...resolved.values()].sort((a, b) => a.key.localeCompare(b.key)),
  };
}

// The source's default insert target: its first loc file by path. Only an editable
// source with a mod identity can be one — the vanilla folder is never written.
function writeTargetOf(
  source: IndexSource,
  files: readonly string[],
): LocWriteTarget | null {
  const first = files[0];
  if (source.permission !== 'editable' || source.modId === null) return null;
  if (first === undefined) return null;
  return { modId: source.modId, relativePath: first };
}
