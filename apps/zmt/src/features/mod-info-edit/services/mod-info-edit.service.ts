import { DESCRIPTOR_FILENAME } from '@contracts';

export const modInfoEditService = {
  descriptorPathForRoot(rootPath: string): string {
    return `${rootPath}/${DESCRIPTOR_FILENAME}`;
  },
  readDescriptor(path: string): Promise<string> {
    return window.api.fs.readTextFile(path);
  },
  writeDescriptor(path: string, content: string): Promise<void> {
    return window.api.fs.writeTextFile(path, content);
  },
};
