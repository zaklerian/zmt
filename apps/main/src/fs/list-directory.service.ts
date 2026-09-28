import {
  FILE_SUPPORT,
  FS_NODE_TYPES,
  type FsNode,
  type FsNodeList,
  IPC_ERROR_CODES,
  type ListOptions,
} from '@zmt/contracts';
import { type Dirent, promises as fs } from 'node:fs';
import path from 'node:path';

import { IpcFailure, isErrno } from '../ipc/ipc-failure.model';
import { classifyFile, extensionOf } from './classify-file.util';
import { type SafePath } from './safe-path.model';

export function isListed(entry: Dirent): boolean {
  return !entry.name.startsWith('.') && !entry.isSymbolicLink();
}

export function compareNodes(a: FsNode, b: FsNode): number {
  if (a.type !== b.type) {
    return a.type === FS_NODE_TYPES.directory ? -1 : 1;
  }
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

export async function directoryHasChildren(directory: string): Promise<boolean> {
  try {
    const names = await fs.readdir(directory);
    return names.some((name) => !name.startsWith('.'));
  } catch {
    return false;
  }
}

export async function readEntries(directory: SafePath): Promise<readonly Dirent[]> {
  try {
    return await fs.readdir(directory, { withFileTypes: true });
  } catch (error: unknown) {
    if (isErrno(error, 'ENOENT')) {
      throw new IpcFailure(IPC_ERROR_CODES.notFound, `Directory not found: ${directory}`);
    }
    if (isErrno(error, 'ENOTDIR')) {
      throw new IpcFailure(IPC_ERROR_CODES.badRequest, `Path is not a directory: ${directory}`);
    }
    throw new IpcFailure(IPC_ERROR_CODES.internal, `Failed to read directory: ${directory}`);
  }
}

export async function toNode(directory: string, entry: Dirent): Promise<FsNode> {
  const fullPath = path.join(directory, entry.name);
  if (entry.isDirectory()) {
    return {
      extension: null,
      hasChildren: await directoryHasChildren(fullPath),
      name: entry.name,
      path: fullPath,
      support: FILE_SUPPORT.readonly,
      type: FS_NODE_TYPES.directory,
    };
  }
  const extension = extensionOf(entry.name);
  return {
    extension,
    hasChildren: false,
    name: entry.name,
    path: fullPath,
    support: classifyFile(extension),
    type: FS_NODE_TYPES.file,
  };
}

export function isVisible(node: FsNode, options: ListOptions): boolean {
  return !options.hideUnsupportedFiles || node.support !== FILE_SUPPORT.unsupported;
}

export async function listDirectory(
  directory: SafePath,
  options: ListOptions,
): Promise<FsNodeList> {
  const entries = await readEntries(directory);
  const nodes = await Promise.all(
    entries.filter(isListed).map(async (entry) => toNode(directory, entry)),
  );
  return nodes.filter((node) => isVisible(node, options)).toSorted(compareNodes);
}
