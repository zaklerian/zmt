import { IPC_ERROR_CODES, IpcError } from '@contracts';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { workspaceStoreService } from '../workspace';

export async function assertPathUnderRoot(target: string): Promise<void> {
  const root = workspaceStoreService.getActiveModPath();

  if (!root) {
    throw {
      code: IPC_ERROR_CODES.FORBIDDEN,
      message: 'No root folder is open',
    } satisfies IpcError;
  }

  const resolvedRoot = await resolveRealPath(path.resolve(root));
  const resolvedTarget = await resolveRealPath(path.resolve(target));

  if (!isContained(resolvedTarget, resolvedRoot)) {
    throw forbidden(target);
  }
}

function forbidden(target: string): IpcError {
  return {
    code: IPC_ERROR_CODES.FORBIDDEN,
    message: `Path is outside the approved root: ${target}`,
  };
}

function isContained(target: string, root: string): boolean {
  return target === root || target.startsWith(root + path.sep);
}

function isEnoent(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT';
}

// Resolves the real (symlink-followed) path of an absolute target. When the
// target itself does not exist yet, the nearest existing ancestor is resolved
// instead and the non-existent tail is re-attached. The tail must not contain
// any '..' segment, so a not-yet-existing path can never climb out of its
// resolved ancestor.
async function resolveRealPath(target: string): Promise<string> {
  try {
    return await fs.realpath(target);
  } catch (error: unknown) {
    if (!isEnoent(error)) {
      throw {
        code: IPC_ERROR_CODES.INTERNAL,
        message: `Failed to resolve path: ${String(error)}`,
      } satisfies IpcError;
    }
  }

  const tail: string[] = [];
  let current = target;

  for (;;) {
    const parent = path.dirname(current);
    tail.unshift(path.basename(current));

    if (tail.includes('..')) {
      throw forbidden(target);
    }

    try {
      const realParent = await fs.realpath(parent);
      return path.join(realParent, ...tail);
    } catch (error: unknown) {
      if (!isEnoent(error)) {
        throw {
          code: IPC_ERROR_CODES.INTERNAL,
          message: `Failed to resolve path: ${String(error)}`,
        } satisfies IpcError;
      }

      if (parent === current) {
        throw forbidden(target);
      }

      current = parent;
    }
  }
}
