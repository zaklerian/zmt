import { FsNode, ListOptions } from '@contracts';

export const modContentService = {
  listDirectory(
    path: string,
    options?: ListOptions,
  ): Promise<readonly FsNode[]> {
    return window.api.fs.listDirectory(path, options);
  },
  readTextFile(path: string): Promise<string> {
    return window.api.fs.readTextFile(path);
  },
  searchFiles(
    root: string,
    query: string,
    options?: ListOptions,
  ): Promise<readonly FsNode[]> {
    return window.api.fs.searchFiles(root, query, options);
  },
  writeTextFile(path: string, content: string): Promise<void> {
    return window.api.fs.writeTextFile(path, content);
  },
};
