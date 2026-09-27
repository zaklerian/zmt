import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const [tsconfig] = process.argv.slice(2);
if (!tsconfig) {
  console.error('usage: expect-typecheck-failure <tsconfig>');
  process.exit(2);
}

const fixtureDir = join(dirname(resolve(tsconfig)), 'fixtures');
const fixtures = readdirSync(fixtureDir)
  .filter((name) => name.endsWith('.ts'))
  .map((name) => relative(process.cwd(), join(fixtureDir, name)));

const result = spawnSync('tsc', ['-p', tsconfig, '--noEmit', '--pretty', 'false'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
});
const output = `${result.stdout}${result.stderr}`;
const diagnostics = output.split('\n').filter((line) => /error TS\d+/.test(line));

const problems = [];
if (result.status === 0) {
  problems.push('typecheck passed, but the negative fixtures must fail it');
}
for (const fixture of fixtures) {
  const hits = diagnostics.filter((line) => line.startsWith(fixture));
  if (hits.length === 0) {
    problems.push(`${fixture} produced no type error`);
  } else {
    console.log(`expected failure: ${hits.join(' | ')}`);
  }
}
const foreign = diagnostics.filter((line) => !fixtures.some((fixture) => line.startsWith(fixture)));
for (const line of foreign) {
  problems.push(`unexpected error outside the fixtures: ${line}`);
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`negative fixtures: ${fixtures.length} of ${fixtures.length} rejected by the compiler`);
