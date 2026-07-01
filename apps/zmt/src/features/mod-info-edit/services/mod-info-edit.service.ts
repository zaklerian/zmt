import { DESCRIPTOR_FILENAME } from '@contracts';

export const modInfoEditService = {
  descriptorPathForRoot(rootPath: string): string {
    return `${rootPath}/${DESCRIPTOR_FILENAME}`;
  },
  // A .mod descriptor is a unique file type, so recognize it by extension
  // wherever it sits — real .mod files are not necessarily at the repo root
  // (BICE's lives under `BICE_modfile/Mod Files/…`), so match the extension on
  // the final path segment rather than a fixed location.
  isDescriptorPath(path: string): boolean {
    const segments = path
      .split(/[/\\]/)
      .filter((segment) => segment.length > 0);
    const last = segments[segments.length - 1];
    return last !== undefined && last.toLowerCase().endsWith('.mod');
  },
  readDescriptor(path: string): Promise<string> {
    return window.api.fs.readTextFile(path);
  },
  writeDescriptor(path: string, content: string): Promise<void> {
    return window.api.fs.writeTextFile(path, content);
  },
};
