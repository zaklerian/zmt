import { join } from 'node:path';

import { ResolutionSource, ResolvedFile } from './resolution.model';

export function resolveLoadOrder(
  sources: readonly ResolutionSource[],
): readonly ResolvedFile[] {
  const contributors = new Map<string, ResolutionSource[]>();

  for (const source of sources) {
    for (const folder of source.replacePaths) {
      for (const [relativePath, contributingSources] of [...contributors]) {
        if (!isUnderFolder(relativePath, folder)) {
          continue;
        }
        const survivors = contributingSources.filter((contributor) =>
          sourceReplacesPath(contributor, relativePath),
        );
        if (survivors.length === 0) {
          contributors.delete(relativePath);
        } else {
          contributors.set(relativePath, survivors);
        }
      }
    }

    for (const relativePath of source.files) {
      const existing = contributors.get(relativePath) ?? [];
      contributors.set(relativePath, [...existing, source]);
    }
  }

  const resolved: ResolvedFile[] = [];
  for (const [relativePath, contributingSources] of contributors) {
    const winningSource = contributingSources[contributingSources.length - 1];
    const shadowedSources = contributingSources.slice(0, -1);
    resolved.push({
      absolutePath: join(winningSource.root, relativePath),
      reason: reasonFor(sources, winningSource, relativePath, shadowedSources),
      relativePath,
      shadowedSources,
      winningSource,
    });
  }

  return resolved.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function isUnderFolder(relativePath: string, folder: string): boolean {
  return relativePath.startsWith(`${folder}/`);
}

function reasonFor(
  sources: readonly ResolutionSource[],
  winningSource: ResolutionSource,
  relativePath: string,
  shadowedSources: readonly ResolutionSource[],
): ResolvedFile['reason'] {
  const winnerIndex = sources.indexOf(winningSource);
  const replaced = sources
    .slice(0, winnerIndex + 1)
    .some((source) => sourceReplacesPath(source, relativePath));

  if (replaced) {
    return 'replace-path';
  }

  return shadowedSources.length > 0 ? 'last-wins' : 'sole-provider';
}

function sourceReplacesPath(
  source: ResolutionSource,
  relativePath: string,
): boolean {
  return source.replacePaths.some((folder) =>
    isUnderFolder(relativePath, folder),
  );
}
