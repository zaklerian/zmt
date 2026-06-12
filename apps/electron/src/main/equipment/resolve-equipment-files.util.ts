import { ProjectedSource } from '@contracts';
import { parse, type Script } from '@paradox-parser';
import { promises as fs } from 'node:fs';

import { resolveLoadOrder } from '../resolution';
import { enumerateEquipmentSources } from './enumerate-equipment-sources.util';

export async function parseGameFile(
  absolutePath: string,
  dialects: readonly string[],
): Promise<Script> {
  return parse(await fs.readFile(absolutePath, 'utf8'), { dialects });
}

// Resolve the equipment files across the given sources into the load order the
// resolver settles on (ADR 016), then parse every winner. Feeds the equipment
// listing's archetype walk (visible-source slice per file).
export async function resolveEquipmentFiles(
  sources: readonly ProjectedSource[],
  dialects: readonly string[],
): Promise<readonly Script[]> {
  const resolved = resolveLoadOrder(
    await enumerateEquipmentSources(sources, dialects),
  );
  return Promise.all(
    resolved.map((file) => parseGameFile(file.absolutePath, dialects)),
  );
}
