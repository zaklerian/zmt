import type { CoverageKey } from './grounding.model';
import type { GroundingReport } from './report.model';

// The report leads with what a reviewer needs first: did it pass, and what is new
// since the baseline (ADR 023 decision 5, output). Everything else — full coverage,
// round-trip, corpus safety — follows. The same markdown is printed to the console
// and written to a file for pasting into the PR body.
export function renderReport(report: GroundingReport): string {
  const lines: string[] = [];
  const verdict = report.passed ? '✅ PASS' : '❌ FAIL';
  lines.push(`# Data-grounding report — ${verdict}`);
  lines.push('');
  lines.push(`- Mode: \`${report.mode}\``);
  lines.push(
    `- Corpus: \`${report.corpusRoot}\` (from ${report.corpusOrigin})`,
  );
  lines.push(
    `- Files scanned: ${String(report.filesScanned)} ` +
      `(${String(report.entityFiles)} recognized entity files)`,
  );
  lines.push(
    `- Unmodeled keys: ${String(report.coverageKeys.length)} total, ` +
      `${String(report.newKeys.length)} new since baseline`,
  );
  lines.push('');

  lines.push('## New since baseline');
  if (report.newKeys.length === 0) {
    lines.push(
      '_None — no unmodeled key appeared that the baseline does not cover._',
    );
  } else {
    lines.push(
      'These unmodeled keys are **not** in the baseline. Each is either a real ' +
        'drop to ticket or an intentional lossless region to add to the baseline:',
    );
    lines.push('');
    lines.push(...keyTable(report.newKeys));
  }
  lines.push('');

  lines.push('## Round-trip');
  lines.push(
    report.parseFailures.length === 0
      ? '- Parse: all files parsed with no errors.'
      : `- Parse errors in ${String(report.parseFailures.length)} file(s):`,
  );
  for (const failure of report.parseFailures.slice(0, 20)) {
    lines.push(
      `  - \`${failure.relativePath}:${String(failure.line)}\` — ${failure.message}`,
    );
  }
  lines.push(
    report.serializeFailures.length === 0
      ? '- parse → serialize → byte-identity: all files identical.'
      : `- parse → serialize byte MISMATCH in ${String(report.serializeFailures.length)} file(s):`,
  );
  for (const failure of report.serializeFailures.slice(0, 20)) {
    lines.push(`  - \`${failure.relativePath}\` — ${failure.detail}`);
  }
  if (report.write.status === 'blocked') {
    lines.push(
      `- parse → extract → unmodified write via \`entity-mutation.service\`: ` +
        `⚠️ BLOCKED — ${report.write.reason}`,
    );
  } else if (report.write.failures.length === 0) {
    lines.push(
      '- parse → extract → unmodified write via `entity-mutation.service`: ' +
        'all writes byte-identical.',
    );
  } else {
    lines.push(
      `- parse → extract → unmodified write MISMATCH in ${String(report.write.failures.length)} case(s):`,
    );
    for (const failure of report.write.failures.slice(0, 20)) {
      lines.push(`  - \`${failure.relativePath}\` — ${failure.detail}`);
    }
  }
  lines.push('');

  lines.push('## Corpus immutability (gate 5)');
  lines.push(
    report.corpus.unchanged
      ? '- Verified: no file under the corpus root changed during the run.'
      : `- ⚠️ ${String(report.corpus.changed.length)} corpus path(s) changed:`,
  );
  for (const change of report.corpus.changed.slice(0, 20)) {
    lines.push(`  - ${change}`);
  }
  lines.push('');

  lines.push('## Full coverage (all unmodeled keys)');
  if (report.coverageKeys.length === 0) {
    lines.push('_No unmodeled keys found in the corpus._');
  } else {
    lines.push(...keyTable(report.coverageKeys));
  }
  lines.push('');

  if (report.staleKeys.length > 0) {
    lines.push('## Stale baseline keys (not in this run — informational)');
    for (const ref of report.staleKeys) {
      lines.push(`- \`${ref.entityType}\` / \`${ref.keyPath}\``);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// A compact one-line verdict for the console tail, after the full markdown.
export function renderSummaryLine(report: GroundingReport): string {
  const verdict = report.passed ? 'PASS' : 'FAIL';
  return (
    `[data-grounding] ${verdict} — ` +
    `${String(report.newKeys.length)} new key(s), ` +
    `${String(report.serializeFailures.length)} serialize mismatch(es), ` +
    `write ${report.write.status}, ` +
    `corpus ${report.corpus.unchanged ? 'unchanged' : 'CHANGED'}`
  );
}

function keyTable(keys: readonly CoverageKey[]): string[] {
  const rows: string[] = [
    '| Entity | Key path | Count | Example |',
    '| --- | --- | --- | --- |',
  ];
  for (const key of keys) {
    rows.push(
      `| \`${key.entityType}\` | \`${key.keyPath}\` | ${String(key.occurrences)} | \`${key.example}\` |`,
    );
  }
  return rows;
}
