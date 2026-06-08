import { FsNode } from '@contracts';

export const modContentService = {
  listDirectory(path: string): Promise<readonly FsNode[]> {
    return window.api.fs.listDirectory(path);
  },
  searchFiles(root: string, query: string): Promise<readonly FsNode[]> {
    return window.api.fs.searchFiles(root, query);
  },
};
