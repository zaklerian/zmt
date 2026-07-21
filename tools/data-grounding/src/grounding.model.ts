import type { EntityType } from './entity-type.const';

export interface CorpusFile {
  readonly absolutePath: string;
  readonly entityType: EntityType | null;
  readonly relativePath: string;
}

// One unmodeled key found in the corpus: a source key path present in an entity
// block that the extractor for that entity type does not project into the model.
// Grouped in the report and the baseline by (entityType, keyPath).
export interface CoverageKey {
  readonly entityType: EntityType;
  // `relativePath:line` of the first occurrence — the reviewer's entry point for
  // deciding whether a newly-unmodeled key is intentional.
  readonly example: string;
  readonly keyPath: string;
  readonly occurrences: number;
}

export interface ParseFailure {
  readonly line: number;
  readonly message: string;
  readonly relativePath: string;
}

export interface RoundTripFailure {
  // A short, human-readable diff locating the first byte that diverged.
  readonly detail: string;
  readonly kind: 'serialize' | 'write';
  readonly relativePath: string;
}

// The write round-trip drives the real `entity-mutation.service` (ADR 019 write
// path). That service is Electron-main application code; where an Electron runtime
// is unavailable it cannot be bootstrapped, so the step reports `blocked` with the
// reason rather than being silently skipped or counted as passed (ADR 023: a data
// gate is never satisfied by an argument that it must pass).
export type WriteRoundTripResult =
  | { readonly failures: readonly RoundTripFailure[]; readonly status: 'ran' }
  | { readonly reason: string; readonly status: 'blocked' };
