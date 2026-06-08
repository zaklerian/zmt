import { FILE_SUPPORT, FsNode, IPC_ERROR_CODES, IpcError } from '@contracts';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { classifyFile } from './classify-file.util';
import { assertPathUnderRoot } from './path-guard.util';

export async function listDirectory(targetPath: string): Promise<FsNode[]> {
  await assertPathUnderRoot(targetPath);

  let entries;
  try {
    entries = await fs.readdir(targetPath, { withFileTypes: true });
  } catch (error: unknown) {
    const errnoCode = (error as NodeJS.ErrnoException | undefined)?.code;

    if (errnoCode === 'ENOENT') {
      throw {
        code: IPC_ERROR_CODES.NOT_FOUND,
        message: `Directory not found: ${targetPath}`,
      } satisfies IpcError;
    }

    throw {
      code: IPC_ERROR_CODES.INTERNAL,
      message: `Failed to read directory: ${String(error)}`,
    } satisfies IpcError;
  }

  const nodes: FsNode[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (entry.isSymbolicLink()) continue;

    const fullPath = path.join(targetPath, entry.name);
    const isDirectory = entry.isDirectory();
    const extension = isDirectory
      ? null
      : path.extname(entry.name).toLowerCase() || null;
    const support = isDirectory
      ? FILE_SUPPORT.readonly
      : classifyFile(extension);
    const hasChildren = isDirectory
      ? await directoryHasChildren(fullPath)
      : false;

    nodes.push({
      extension,
      hasChildren,
      name: entry.name,
      path: fullPath,
      support,
      type: isDirectory ? 'directory' : 'file',
    });
  }

  nodes.sort(compareNodes);
  return nodes;
}

function compareNodes(a: FsNode, b: FsNode): number {
  if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

async function directoryHasChildren(dirPath: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(dirPath);
    return entries.some((name) => !name.startsWith('.'));
  } catch {
    return false;
  }
}
