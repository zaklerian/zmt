import { FsNode, ListOptions } from '@contracts';

export const modContentService = {
  listDirectory(
    path: string,
    options?: ListOptions,
  ): Promise<readonly FsNode[]> {
    return window.api.fs.listDirectory(path, options);
  },
  searchFiles(
    root: string,
    query: string,
    options?: ListOptions,
  ): Promise<readonly FsNode[]> {
    return window.api.fs.searchFiles(root, query, options);
  },
};
