import { CharacterEntity } from '@contracts';
import { extractCharacters } from '@e-game-hoi4';
import { dialectsFromPlugins, parse, type Script } from '@paradox-parser';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { assertReadable } from '../fs';
import { pluginRegistryService } from '../plugins';

export async function listCharacters(
  filePath: string,
): Promise<readonly CharacterEntity[]> {
  await assertReadable(filePath);

  const dialects = dialectsFromPlugins(pluginRegistryService.list());
  return extractCharacters(await parseFile(path.resolve(filePath), dialects));
}

async function parseFile(
  absolutePath: string,
  dialects: readonly string[],
): Promise<Script> {
  return parse(await fs.readFile(absolutePath, 'utf8'), { dialects });
}
