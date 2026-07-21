import { DESCRIPTOR_FILENAME, ProjectedSource } from '@contracts';
import { parse } from '@paradox-parser';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { ResolutionSource } from '../resolution';

const EQUIPMENT_DIR = 'common/units/equipment';

export async function enumerateEquipmentSources(
  sources: readonly ProjectedSource[],
  dialects: readonly string[],
): Promise<readonly ResolutionSource[]> {
  return Promise.all(
    sources.map(async (source) => ({
      files: await enumerateEquipmentFiles(source.path),
      replacePaths: await readReplacePaths(source.path, dialects),
      root: source.path,
    })),
  );
}

async function enumerateEquipmentFiles(
  root: string,
): Promise<readonly string[]> {
  let entries;
  try {
    entries = await fs.readdir(path.join(root, EQUIPMENT_DIR), {
      withFileTypes: true,
    });
  } catch {
    return [];
  }
  return entries
    .filter(
      (entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.txt'),
    )
    .map((entry) => `${EQUIPMENT_DIR}/${entry.name}`);
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
