import { DESCRIPTOR_EXTENSION, DESCRIPTOR_FILENAME } from './mod-descriptor.model';

export function descriptorPathForRoot(rootPath: string): string {
  return `${rootPath}/${DESCRIPTOR_FILENAME}`;
}

export function isDescriptorPath(path: string): boolean {
  const segments = path.split(/[/\\]/u).filter((segment) => segment.length > 0);
  return segments.at(-1)?.toLowerCase().endsWith(DESCRIPTOR_EXTENSION) ?? false;
}
