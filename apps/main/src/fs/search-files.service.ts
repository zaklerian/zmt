import { FS_NODE_TYPES, type FsNode, type FsNodeList, type ListOptions } from '@zmt/contracts';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { classifyFile, extensionOf } from './classify-file.util';
import { isListed, isVisible } from './list-directory.service';
import { type SafePath } from './safe-path.model';

export const SEARCH_RESULT_LIMIT = 50;

export const SEARCH_MAX_DEPTH = 12;

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function matchesQuery(name: string, normalizedQuery: string): boolean {
  return name.toLowerCase().includes(normalizedQuery);
}

export async function searchFiles(
  root: SafePath,
  query: string,
  options: ListOptions,
): Promise<FsNodeList> {
  const normalizedQuery = normalizeQuery(query);
  if (normalizedQuery === '') {
    return [];
  }
  let results: readonly FsNode[] = [];

  async function walk(directory: string, depth: number): Promise<void> {
    if (depth > SEARCH_MAX_DEPTH) {
      return;
    }
    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    const sorted = entries.toSorted((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
    for (const entry of sorted) {
      if (results.length >= SEARCH_RESULT_LIMIT) {
        return;
      }
      if (!isListed(entry)) {
        continue;
      }
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath, depth + 1);
        continue;
      }
      if (!entry.isFile() || !matchesQuery(entry.name, normalizedQuery)) {
        continue;
      }
      const extension = extensionOf(entry.name);
      const node: FsNode = {
        extension,
        hasChildren: false,
        name: entry.name,
        path: fullPath,
        support: classifyFile(extension),
        type: FS_NODE_TYPES.file,
      };
      if (isVisible(node, options)) {
        results = [...results, node];
      }
    }
  }

  await walk(root, 0);
  return results;
}
