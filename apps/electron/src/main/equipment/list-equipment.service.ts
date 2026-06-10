import {
  EquipmentEntity,
  IPC_ERROR_CODES,
  IpcError,
  ProjectedSource,
} from '@contracts';
import { buildArchetypeIndex, extractEquipment } from '@e-game-hoi4';
import { dialectsFromPlugins, parse, type Script } from '@paradox-parser';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { assertReadable } from '../fs';
import { pluginRegistryService } from '../plugins';
import { resolveLoadOrder } from '../resolution';
import {
  activeGameFolderPath,
  activeGameId,
  resolveProjectedSources,
  workspaceStoreService,
} from '../workspace';
import { enumerateEquipmentSources } from './enumerate-equipment-sources.util';

export async function listEquipment(
  filePath: string,
): Promise<readonly EquipmentEntity[]> {
  await assertReadable(filePath);

  const sources = resolveProjectedSources(
    activeGameId(),
    workspaceStoreService.get(),
    await activeGameFolderPath(),
  );
  const dialects = dialectsFromPlugins(pluginRegistryService.list());

  const resolved = resolveLoadOrder(
    await enumerateEquipmentSources(visibleTo(sources, filePath), dialects),
  );
  const index = buildArchetypeIndex(
    await Promise.all(
      resolved.map((file) => parseFile(file.absolutePath, dialects)),
    ),
  );

  return extractEquipment(
    await parseFile(path.resolve(filePath), dialects),
    index,
  );
}

function isContained(target: string, root: string): boolean {
  return target === root || target.startsWith(root + path.sep);
}

async function parseFile(
  absolutePath: string,
  dialects: readonly string[],
): Promise<Script> {
  return parse(await fs.readFile(absolutePath, 'utf8'), { dialects });
}

function visibleTo(
  sources: readonly ProjectedSource[],
  filePath: string,
): readonly ProjectedSource[] {
  const target = path.resolve(filePath);
  const index = sources.findIndex((source) =>
    isContained(target, path.resolve(source.path)),
  );
  if (index === -1) {
    throw {
      code: IPC_ERROR_CODES.FORBIDDEN,
      message: `Path is outside the approved root: ${filePath}`,
    } satisfies IpcError;
  }
  return sources.slice(0, index + 1);
}
