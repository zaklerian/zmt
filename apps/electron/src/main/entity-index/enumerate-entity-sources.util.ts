import { DESCRIPTOR_FILENAME } from '@contracts';
import { parse } from '@paradox-parser';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { ResolutionSource } from '../resolution';
import type { IndexSource } from './entity-index.model';

// Enumerates one entity type's `folder` across the given sources, folder-scoped:
// each source's `.txt` files directly in `folder`, plus its `replace_path`
// declarations, shaped for `resolveLoadOrder` (ADR 016). Generalizes
// equipment's `enumerateEquipmentSources` over an arbitrary folder (ADR 024
// decision 2 / 7). `root` is the source path, the key the build util maps back
// to the `IndexSource` for the provenance table. A source lacking the folder or
// descriptor contributes an empty list rather than failing the whole enumeration.
export async function enumerateEntitySources(
  sources: readonly IndexSource[],
  folder: string,
  dialects: readonly string[],
): Promise<readonly ResolutionSource[]> {
  return Promise.all(
    sources.map(async (source) => ({
      files: await enumerateFolderFiles(source.path, folder),
      replacePaths: await readReplacePaths(source.path, dialects),
      root: source.path,
    })),
  );
}

async function enumerateFolderFiles(
  root: string,
  folder: string,
): Promise<readonly string[]> {
  let entries;
  try {
    entries = await fs.readdir(path.join(root, folder), {
      withFileTypes: true,
    });
  } catch {
    return [];
  }
  return entries
    .filter(
      (entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.txt'),
    )
    .map((entry) => `${folder}/${entry.name}`);
}

async function readReplacePaths(
  root: string,
  dialects: readonly string[],
): Promise<readonly string[]> {
  let text;
  try {
    text = await fs.readFile(path.join(root, DESCRIPTOR_FILENAME), 'utf8');
  } catch {
    return [];
  }

  const replacePaths: string[] = [];
  for (const child of parse(text, { dialects }).children) {
    if (child.kind !== 'Assignment') {
      continue;
    }
    const key =
      child.key.kind === 'StringValue' ? child.key.value : child.key.name;
    if (key !== 'replace_path') {
      continue;
    }
    if (child.value.kind === 'StringValue') {
      replacePaths.push(child.value.value);
    } else if (child.value.kind === 'Identifier') {
      replacePaths.push(child.value.name);
    }
  }
  return replacePaths;
}
