import { TechnologyEntity } from '@contracts';
import { extractTechnologies } from '@e-game-hoi4';
import { dialectsFromPlugins, parse, type Script } from '@paradox-parser';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { assertReadable } from '../fs';
import { pluginRegistryService } from '../plugins';

export async function listTechnologies(
  filePath: string,
): Promise<readonly TechnologyEntity[]> {
  await assertReadable(filePath);

  const dialects = dialectsFromPlugins(pluginRegistryService.list());
  return extractTechnologies(await parseFile(path.resolve(filePath), dialects));
}

async function parseFile(
  absolutePath: string,
  dialects: readonly string[],
): Promise<Script> {
  return parse(await fs.readFile(absolutePath, 'utf8'), { dialects });
}
