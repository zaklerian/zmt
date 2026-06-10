import { ProjectedSource } from '@contracts';

export interface BreadcrumbTrail {
  readonly segments: readonly string[];
  readonly sourceName: string;
}

export function toBreadcrumbTrail(
  selectedPath: null | string,
  sources: readonly ProjectedSource[],
): BreadcrumbTrail | null {
  if (selectedPath === null) return null;

  let owner: null | string = null;
  for (const source of sources) {
    if (
      isUnderOrEqual(source.path, selectedPath) &&
      (owner === null || source.path.length > owner.length)
    ) {
      owner = source.path;
    }
  }
  if (owner === null) return null;

  const segments = selectedPath
    .slice(owner.length)
    .split(/[/\\]/)
    .filter((segment) => segment.length > 0);
  return { segments, sourceName: basename(owner) };
}

function basename(path: string): string {
  const parts = path.split(/[/\\]/).filter((part) => part.length > 0);
  return parts[parts.length - 1] ?? path;
}

function isUnderOrEqual(root: string, target: string): boolean {
  if (target === root) return true;
  if (!target.startsWith(root)) return false;
  const rest = target.slice(root.length);
  return rest.startsWith('/') || rest.startsWith('\\');
}
