import type { Script } from '@paradox-parser';

import { serialize } from '@paradox-parser';

import type { RoundTripFailure } from './grounding.model';

import { lineOf } from './key-path.util';

// parse → serialize → byte-identity. This proves only that untouched bytes are
// copied back untouched (ADR 023 context); it is the necessary-not-sufficient
// half of the gate, run over every parseable file. The coverage report is the
// other half.
export function checkSerializeIdentity(
  relativePath: string,
  script: Script,
  source: string,
): null | RoundTripFailure {
  const out = serialize(script, source);
  if (out === source) return null;
  return {
    detail: describeDivergence(source, out),
    kind: 'serialize',
    relativePath,
  };
}

function describeDivergence(expected: string, actual: string): string {
  let i = 0;
  const max = Math.min(expected.length, actual.length);
  while (i < max && expected[i] === actual[i]) i += 1;
  const line = lineOf(expected, i);
  const expectedSlice = JSON.stringify(expected.slice(i, i + 40));
  const actualSlice = JSON.stringify(actual.slice(i, i + 40));
  return (
    `first divergence at byte ${String(i)} (line ${String(line)}): ` +
    `source ${expectedSlice} vs serialized ${actualSlice}`
  );
}
