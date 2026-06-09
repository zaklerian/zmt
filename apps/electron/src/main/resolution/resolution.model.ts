export interface ResolutionSource {
  readonly files: readonly string[];
  readonly replacePaths: readonly string[];
  readonly root: string;
}

export interface ResolvedFile {
  readonly absolutePath: string;
  readonly reason: 'last-wins' | 'replace-path' | 'sole-provider';
  readonly relativePath: string;
  readonly shadowedSources: readonly ResolutionSource[];
  readonly winningSource: ResolutionSource;
}
