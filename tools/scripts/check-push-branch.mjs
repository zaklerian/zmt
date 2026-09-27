import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { parsePushRefs, pushProblems } from '../commitlint-plugin/src/grammar.ts';

const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
  encoding: 'utf8',
}).trim();
const stdin = process.stdin.isTTY ? '' : readFileSync(0, 'utf8');
const problems = pushProblems(branch, parsePushRefs(stdin));

if (problems.length > 0) {
  console.error(`pre-push blocked:\n${problems.map((problem) => `  ${problem}`).join('\n')}`);
  process.exit(1);
}
