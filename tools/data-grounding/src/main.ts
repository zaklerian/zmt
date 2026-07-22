import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { ParsedFile } from './coverage.util';
import type { ParseFailure, RoundTripFailure } from './grounding.model';
import type { GroundingMode, GroundingReport } from './report.model';

import { diffBaseline, loadBaseline, writeBaseline } from './baseline.util';
import { CorpusConfigError, resolveCorpusRoot } from './corpus-config.util';
import { diffManifests, snapshotCorpus } from './corpus-guard.util';
import { scanCorpus } from './corpus-scan.util';
import { computeCorpusCoverage } from './coverage.util';
import { makeLineLookup } from './key-path.util';
import { parseSource } from './parse-file.util';
import { renderReport, renderSummaryLine } from './report.util';
import { checkSerializeIdentity } from './round-trip.util';
import { runWriteRoundTrip } from './write-driver.util';

const BASELINE_PATH = resolve(
  process.cwd(),
  'tools/data-grounding/baseline/coverage-baseline.json',
);
const REPORT_PATH = resolve(
  process.cwd(),
  'tools/data-grounding/last-report.md',
);

async function main(): Promise<number> {
  const mode: GroundingMode = process.argv.includes('--update-baseline')
    ? 'update-baseline'
    : 'verify';

  let corpus;
  try {
    corpus = resolveCorpusRoot();
  } catch (error: unknown) {
    if (error instanceof CorpusConfigError) {
      process.stderr.write(`\n[data-grounding] ${error.message}\n\n`);
      return 2;
    }
    throw error;
  }

  const readFile = await import('node:fs/promises');
  const before = snapshotCorpus(corpus.root);
  const files = scanCorpus(corpus.root);

  const parsed: ParsedFile[] = [];
  const parseFailures: ParseFailure[] = [];
  const serializeFailures: RoundTripFailure[] = [];
  for (const file of files) {
    const source = await readFile.readFile(file.absolutePath, 'utf8');
    const script = parseSource(source);
    parsed.push({ file, script, source });
    if (script.errors.length > 0) {
      const lineAt = makeLineLookup(source);
      for (const parseError of script.errors) {
        parseFailures.push({
          line: lineAt(parseError.from),
          message: parseError.message,
          relativePath: file.relativePath,
        });
      }
    }
    const identity = checkSerializeIdentity(file.relativePath, script, source);
    if (identity !== null) serializeFailures.push(identity);
  }

  const entityFiles = parsed.filter((item) => item.file.entityType !== null);
  const coverage = computeCorpusCoverage(entityFiles);
  const write = await runWriteRoundTrip(
    entityFiles,
    coverage.writeTargetsByPath,
  );

  if (mode === 'update-baseline') {
    writeBaseline(BASELINE_PATH, coverage.keys);
  }

  const baseline = loadBaseline(BASELINE_PATH);
  const baselineDiff = diffBaseline(coverage.keys, baseline);
  const after = snapshotCorpus(corpus.root);
  const corpusDiff = diffManifests(before, after);

  const newKeys = mode === 'update-baseline' ? [] : baselineDiff.newKeys;
  const writeFailed = write.status === 'ran' && write.failures.length > 0;
  const passed =
    serializeFailures.length === 0 &&
    newKeys.length === 0 &&
    corpusDiff.unchanged &&
    !writeFailed;

  const report: GroundingReport = {
    corpus: corpusDiff,
    corpusOrigin: corpus.origin,
    corpusRoot: corpus.root,
    coverageKeys: coverage.keys,
    entityFiles: entityFiles.length,
    filesScanned: files.length,
    mode,
    newKeys,
    parseFailures,
    passed,
    serializeFailures,
    staleKeys: baselineDiff.stale,
    write,
  };

  const markdown = renderReport(report);
  writeFileSync(REPORT_PATH, `${markdown}\n`, 'utf8');
  process.stdout.write(`${markdown}\n\n${renderSummaryLine(report)}\n`);

  return passed ? 0 : 1;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    process.stderr.write(
      `\n[data-grounding] unexpected error: ${String(error)}\n`,
    );
    process.exitCode = 1;
  });
