import { promises as fs } from 'node:fs';
import path from 'node:path';

// Localisation lives under this folder in every Clausewitz source; the engine
// walks it recursively (`localisation/english/…`, `localisation/replace/english/…`).
const LOC_FOLDER = 'localisation';
const LOC_EXTENSION = '.yml';

// Enumerates one source's localisation files for `language`, as source-relative
// paths sorted by path. Sorted so the load order within a source is deterministic
// (filename minor, matching the entity index's stage-2 ordering) and so the
// default write target is stable across calls rather than readdir-order-dependent.
//
// The language filter is the `_l_<language>` filename suffix the engine itself
// keys on (`air_l_english.yml`), matched case-insensitively — NOT the containing
// directory, because a source may place a file for one language under a directory
// named for another and the engine reads the suffix.
export async function enumerateLocFiles(
  root: string,
  language: string,
): Promise<readonly string[]> {
  const suffix = `_l_${language}${LOC_EXTENSION}`.toLowerCase();
  const found = await walk(path.join(root, LOC_FOLDER), LOC_FOLDER, suffix);
  return [...found].sort((a, b) => a.localeCompare(b));
}

async function walk(
  absoluteDir: string,
  relativeDir: string,
  suffix: string,
): Promise<readonly string[]> {
  let entries;
  try {
    entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: string[] = [];
  for (const entry of entries) {
    const relative = `${relativeDir}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(
        ...(await walk(path.join(absoluteDir, entry.name), relative, suffix)),
      );
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(suffix)) {
      files.push(relative);
    }
  }
  return files;
}
