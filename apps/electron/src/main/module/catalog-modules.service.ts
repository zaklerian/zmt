import { CatalogModule, EquipmentDomain, ProjectedSource } from '@contracts';
import { extractModules, MODULE_DIR } from '@e-game-hoi4';
import { dialectsFromPlugins, parse } from '@paradox-parser';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { moduleDomainIndex } from '../equipment';
import { assertReadable } from '../fs';
import { pluginRegistryService } from '../plugins';
import {
  activeGameFolderPath,
  activeGameId,
  resolveProjectedSources,
  workspaceStoreService,
} from '../workspace';

export async function catalogModules(): Promise<readonly CatalogModule[]> {
  const sources = resolveProjectedSources(
    activeGameId(),
    workspaceStoreService.get(),
    await activeGameFolderPath(),
  );
  const dialects = dialectsFromPlugins(pluginRegistryService.list());
  const domainIndex = await moduleDomainIndex();

  const perSource = await Promise.all(
    sources.map((source) => modulesInSource(source, dialects, domainIndex)),
  );

  // Sources arrive lowest → highest precedence (ADR 016, source ordering only).
  // Merging in that order and keying by module name yields entity-level
  // last-wins: a higher-precedence source overwrites a same-named module from a
  // lower one. This is name-identity dedup, NOT the ADR 016 file-level resolver.
  const byName = new Map<string, CatalogModule>();
  for (const modules of perSource) {
    for (const module of modules) {
      byName.set(module.name, module);
    }
  }
  return [...byName.values()];
}

async function enumerateModuleFiles(root: string): Promise<readonly string[]> {
  let entries;
  try {
    entries = await fs.readdir(path.join(root, MODULE_DIR), {
      withFileTypes: true,
    });
  } catch {
    return [];
  }
  return entries
    .filter(
      (entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.txt'),
    )
    .map((entry) => `${MODULE_DIR}/${entry.name}`);
}

async function modulesInFile(
  absolutePath: string,
  source: string,
  dialects: readonly string[],
  domainIndex: ReadonlyMap<string, EquipmentDomain>,
): Promise<readonly CatalogModule[]> {
  await assertReadable(absolutePath);
  const script = parse(await fs.readFile(absolutePath, 'utf8'), { dialects });
  return extractModules(script, domainIndex).map((module) => ({
    category: module.category,
    domain: module.domain,
    name: module.name,
    source,
  }));
}

async function modulesInSource(
  source: ProjectedSource,
  dialects: readonly string[],
  domainIndex: ReadonlyMap<string, EquipmentDomain>,
): Promise<readonly CatalogModule[]> {
  const relativePaths = await enumerateModuleFiles(source.path);
  const perFile = await Promise.all(
    relativePaths.map((relativePath) =>
      modulesInFile(
        path.resolve(source.path, relativePath),
        source.path,
        dialects,
        domainIndex,
      ),
    ),
  );
  return perFile.flat();
}
