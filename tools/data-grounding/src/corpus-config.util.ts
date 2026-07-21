import { readFileSync, statSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

// The corpus root is configuration, never vendored data (ADR 023, decision 5):
// the harness points at a real mod on disk and which mod is local setup. Two
// sources are accepted, env first: the env var is ephemeral and absent by default
// (so an unconfigured run — CI included — fails loudly instead of silently
// scanning nothing), and the gitignored local file spares a repeat local operator
// re-exporting it each run. Both keep third-party mod data out of the repo.
const ENV_VAR = 'ZMT_GROUNDING_CORPUS';
const LOCAL_CONFIG_RELATIVE = 'tools/data-grounding/corpus.local.json';

export interface CorpusRoot {
  readonly origin: string;
  readonly root: string;
}

export class CorpusConfigError extends Error {}

export function resolveCorpusRoot(): CorpusRoot {
  const configured = fromEnv() ?? fromLocalConfig();
  if (configured === null) {
    throw new CorpusConfigError(
      `No corpus root configured. Set ${ENV_VAR}=/absolute/path/to/mod, ` +
        `or create ${LOCAL_CONFIG_RELATIVE} with { "root": "/absolute/path/to/mod" }. ` +
        `No mod data is vendored into this repo (ADR 023).`,
    );
  }

  const root = resolve(configured.root);
  assertReadableDirectory(root, configured.origin);
  return { origin: configured.origin, root };
}

function assertReadableDirectory(root: string, origin: string): void {
  let stats;
  try {
    stats = statSync(root);
  } catch {
    throw new CorpusConfigError(
      `Corpus root is unreadable: ${root} (from ${origin}). ` +
        `Check the path exists and is accessible.`,
    );
  }
  if (!stats.isDirectory()) {
    throw new CorpusConfigError(
      `Corpus root is not a directory: ${root} (from ${origin}).`,
    );
  }
}

function fromEnv(): { origin: string; root: string } | null {
  const value = process.env[ENV_VAR];
  if (value === undefined || value.trim() === '') return null;
  return { origin: `env ${ENV_VAR}`, root: value.trim() };
}

function fromLocalConfig(): { origin: string; root: string } | null {
  const path = resolve(process.cwd(), LOCAL_CONFIG_RELATIVE);
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CorpusConfigError(`${LOCAL_CONFIG_RELATIVE} is not valid JSON.`);
  }
  const root = (parsed as { root?: unknown } | null)?.root;
  if (typeof root !== 'string' || root.trim() === '') {
    throw new CorpusConfigError(
      `${LOCAL_CONFIG_RELATIVE} must contain a non-empty string "root".`,
    );
  }
  const trimmed = root.trim();
  if (!isAbsolute(trimmed)) {
    throw new CorpusConfigError(
      `${LOCAL_CONFIG_RELATIVE} "root" must be an absolute path: ${trimmed}`,
    );
  }
  return { origin: LOCAL_CONFIG_RELATIVE, root: trimmed };
}
