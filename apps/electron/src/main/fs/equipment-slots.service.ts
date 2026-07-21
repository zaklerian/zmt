import {
  EquipmentSlotsRequest,
  EquipmentSlotsResult,
  IPC_ERROR_CODES,
  IpcError,
} from '@contracts';
import { extractSlots } from '@e-game-hoi4';
import { type BlockChild, dialectsFromPlugins, parse } from '@paradox-parser';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { pluginRegistryService } from '../plugins';
import { workspaceStoreService } from '../workspace';
import { assertReadable } from './path-guard.util';

export async function readEquipmentSlots(
  request: EquipmentSlotsRequest,
): Promise<EquipmentSlotsResult> {
  const mod = workspaceStoreService
    .get()
    .includedMods.find((candidate) => candidate.id === request.modId);
  if (mod === undefined) {
    throw {
      code: IPC_ERROR_CODES.FORBIDDEN,
      message: `No source for id: ${request.modId}`,
    } satisfies IpcError;
  }

  const absolutePath = path.resolve(mod.path, request.relativePath);
  await assertReadable(absolutePath);

  const script = parse(await readSource(absolutePath), {
    dialects: dialectsFromPlugins(pluginRegistryService.list()),
  });

  // AST nodes from @paradox-parser are mutable, so the breadth-first descent
  // stays inline on locals: prefer-readonly-parameter-types (P-1) bars a
  // node-typed helper param.
  const worklist: BlockChild[] = [...script.children];
  while (worklist.length > 0) {
    const current = worklist.shift();
    if (current === undefined || current.kind !== 'Assignment') continue;
    if (current.value.kind !== 'Block') continue;
    const name =
      current.key.kind === 'StringValue' ? current.key.value : current.key.name;
    if (name === request.entityName) {
      return extractSlots(current.value);
    }
    worklist.push(...current.value.children);
  }

  throw {
    code: IPC_ERROR_CODES.NOT_FOUND,
    message: `Entity not found: ${request.entityName}`,
  } satisfies IpcError;
}

async function readSource(absolutePath: string): Promise<string> {
  try {
    return await fs.readFile(absolutePath, 'utf8');
  } catch (error: unknown) {
    const errnoCode = (error as NodeJS.ErrnoException | undefined)?.code;
    if (errnoCode === 'ENOENT') {
      throw {
        code: IPC_ERROR_CODES.NOT_FOUND,
        message: `File not found: ${absolutePath}`,
      } satisfies IpcError;
    }
    throw {
      code: IPC_ERROR_CODES.INTERNAL,
      message: `Failed to read file: ${String(error)}`,
    } satisfies IpcError;
  }
}
