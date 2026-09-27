import { readFileSync } from 'node:fs';

const EXACT = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;
const SECTIONS = ['dependencies', 'devDependencies', 'optionalDependencies'];

const files = process.argv.slice(2).filter((file) => file.endsWith('package.json'));
const manifest = files.length > 0 ? files : ['package.json'];

const problems = manifest.flatMap((file) => {
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  return SECTIONS.flatMap((section) =>
    Object.entries(pkg[section] ?? {})
      .filter(([, version]) => !EXACT.test(version))
      .map(
        ([name, version]) => `${file}: ${section}.${name} is "${version}", not an exact version`,
      ),
  );
});

if (problems.length > 0) {
  console.error(`SEC-5 requires exact dependency pins:\n${problems.join('\n')}`);
  process.exit(1);
}
