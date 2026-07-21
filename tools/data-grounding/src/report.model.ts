import type { BaselineKeyRef } from './baseline.model';
import type { CorpusDiff } from './corpus-guard.util';
import type {
  CoverageKey,
  ParseFailure,
  RoundTripFailure,
  WriteRoundTripResult,
} from './grounding.model';

export type GroundingMode = 'update-baseline' | 'verify';

export interface GroundingReport {
  readonly corpus: CorpusDiff;
  readonly corpusOrigin: string;
  readonly corpusRoot: string;
  readonly coverageKeys: readonly CoverageKey[];
  readonly entityFiles: number;
  readonly filesScanned: number;
  readonly mode: GroundingMode;
  // Unmodeled keys new since the baseline — the ratchet's fail set (empty in
  // update-baseline mode, where the baseline is being (re)written).
  readonly newKeys: readonly CoverageKey[];
  readonly parseFailures: readonly ParseFailure[];
  readonly passed: boolean;
  readonly serializeFailures: readonly RoundTripFailure[];
  readonly staleKeys: readonly BaselineKeyRef[];
  readonly write: WriteRoundTripResult;
}
