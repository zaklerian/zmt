import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CorpusConfigError, resolveCorpusRoot } from './corpus-config.util';

const ENV_VAR = 'ZMT_GROUNDING_CORPUS';

describe('resolveCorpusRoot', () => {
  let previous: string | undefined;

  beforeEach(() => {
    previous = process.env[ENV_VAR];
    delete process.env[ENV_VAR];
  });

  afterEach(() => {
    if (previous === undefined) delete process.env[ENV_VAR];
    else process.env[ENV_VAR] = previous;
  });

  it('throws an actionable error when nothing is configured', () => {
    // The spec cwd holds no corpus.local.json under a nested tools/ path, so the
    // only source is the (cleared) env var.
    expect(() => resolveCorpusRoot()).toThrow(CorpusConfigError);
    expect(() => resolveCorpusRoot()).toThrow(ENV_VAR);
  });

  it('reads the env var and reports its origin', () => {
    process.env[ENV_VAR] = import.meta.dirname;
    const resolved = resolveCorpusRoot();
    expect(resolved.root).toBe(import.meta.dirname);
    expect(resolved.origin).toContain(ENV_VAR);
  });

  it('throws when the configured root is not a directory', () => {
    process.env[ENV_VAR] = `${import.meta.dirname}/main.ts`;
    expect(() => resolveCorpusRoot()).toThrow(/not a directory/);
  });

  it('throws when the configured root is unreadable', () => {
    process.env[ENV_VAR] = '/no/such/corpus/root/xyz';
    expect(() => resolveCorpusRoot()).toThrow(/unreadable/);
  });
});
