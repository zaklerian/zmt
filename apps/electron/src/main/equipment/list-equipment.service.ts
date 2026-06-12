import {
  EquipmentEntity,
  IPC_ERROR_CODES,
  IpcError,
  ProjectedSource,
} from '@contracts';
import { buildArchetypeIndex, extractEquipment } from '@e-game-hoi4';
import { dialectsFromPlugins } from '@paradox-parser';
import path from 'node:path';

import { assertReadable } from '../fs';
import { pluginRegistryService } from '../plugins';
import {
  activeGameFolderPath,
  activeGameId,
  resolveProjectedSources,
  workspaceStoreService,
} from '../workspace';
import {
  parseGameFile,
  resolveEquipmentFiles,
} from './resolve-equipment-files.util';

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

  const index = buildArchetypeIndex(
    await resolveEquipmentFiles(visibleTo(sources, filePath), dialects),
  );

  return extractEquipment(
    await parseGameFile(path.resolve(filePath), dialects),
    index,
  );
}

function isContained(target: string, root: string): boolean {
  return target === root || target.startsWith(root + path.sep);
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
