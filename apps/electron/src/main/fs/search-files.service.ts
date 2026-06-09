import {
  FILE_SUPPORT,
  FsNode,
  IPC_ERROR_CODES,
  IpcError,
  ListOptions,
} from '@contracts';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { classifyFile } from './classify-file.util';
import { assertPathUnderRoot } from './path-guard.util';

const SEARCH_RESULT_LIMIT = 50;
const SEARCH_MAX_DEPTH = 12;

export async function searchFiles(
  root: string,
  query: string,
  options?: ListOptions,
): Promise<FsNode[]> {
  await assertPathUnderRoot(root);

  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const results: FsNode[] = [];

  async function walk(dir: string, depth: number): Promise<void> {
    if (results.length >= SEARCH_RESULT_LIMIT) return;
    if (depth > SEARCH_MAX_DEPTH) return;

    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= SEARCH_RESULT_LIMIT) return;
      if (entry.name.startsWith('.')) continue;
      if (entry.isSymbolicLink()) continue;

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath, depth + 1);
        continue;
      }

      if (!entry.isFile()) continue;

      const extension = path.extname(entry.name).toLowerCase() || null;
      const support = classifyFile(extension);
      if (
        options?.hideUnsupportedFiles === true &&
        support === FILE_SUPPORT.unsupported
      )
        continue;
      if (!entry.name.toLowerCase().includes(normalizedQuery)) continue;

      results.push({
        extension,
        hasChildren: false,
        name: entry.name,
        path: fullPath,
        support,
        type: 'file',
      });
    }
  }

  try {
    await walk(root, 0);
  } catch (error: unknown) {
    throw {
      code: IPC_ERROR_CODES.INTERNAL,
      message: `Search failed: ${String(error)}`,
    } satisfies IpcError;
  }

  return results;
}
