import { IPC_ERROR_CODES, IpcError, ProjectedSource } from '@contracts';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import {
  activeGameFolderPath,
  activeGameId,
  resolveProjectedSources,
  workspaceStoreService,
} from '../workspace';

export async function assertReadable(
  target: string,
  sources?: readonly ProjectedSource[],
): Promise<void> {
  await assertUnderSource(target, () => true, sources);
}

export async function assertWritable(
  target: string,
  sources?: readonly ProjectedSource[],
): Promise<void> {
  await assertUnderSource(
    target,
    (source) => source.permission === 'editable',
    sources,
  );
}

// `injectedSources`, when supplied, are the already-resolved projected sources
// the caller guards against; the guard then touches no store. Omitting them keeps
// the store-backed resolution every existing caller relies on. The containment and
// permission checks below are identical either way — injection changes only where
// the source list comes from, never what the guard enforces (ADR 027 decision 6).
async function assertUnderSource(
  target: string,
  permits: (source: ProjectedSource) => boolean,
  injectedSources?: readonly ProjectedSource[],
): Promise<void> {
  const sources =
    injectedSources ??
    resolveProjectedSources(
      activeGameId(),
      workspaceStoreService.get(),
      await activeGameFolderPath(),
    );

  if (sources.length === 0) {
    throw {
      code: IPC_ERROR_CODES.FORBIDDEN,
      message: 'No root folder is open',
    } satisfies IpcError;
  }

  const resolvedTarget = await resolveRealPath(path.resolve(target));
  const containing = await findContainingSource(sources, resolvedTarget);

  if (containing === null || !permits(containing)) {
    throw forbidden(target);
  }
}

async function findContainingSource(
  sources: readonly ProjectedSource[],
  resolvedTarget: string,
): Promise<null | ProjectedSource> {
  for (const source of sources) {
    const resolvedRoot = await resolveRealPath(path.resolve(source.path));
    if (isContained(resolvedTarget, resolvedRoot)) {
      return source;
    }
  }
  return null;
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
