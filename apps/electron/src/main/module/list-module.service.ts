import { ModuleEntity } from '@contracts';
import { extractModules } from '@e-game-hoi4';
import { dialectsFromPlugins, parse, type Script } from '@paradox-parser';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { moduleDomainIndex } from '../equipment';
import { assertReadable } from '../fs';
import { pluginRegistryService } from '../plugins';

export async function listModules(
  filePath: string,
): Promise<readonly ModuleEntity[]> {
  await assertReadable(filePath);

  const dialects = dialectsFromPlugins(pluginRegistryService.list());
  const domainIndex = await moduleDomainIndex();
  return extractModules(
    await parseFile(path.resolve(filePath), dialects),
    domainIndex,
  );
}

async function parseFile(
  absolutePath: string,
  dialects: readonly string[],
): Promise<Script> {
  return parse(await fs.readFile(absolutePath, 'utf8'), { dialects });
}
