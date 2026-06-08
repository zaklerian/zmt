# ADR 004 — Barrel exports as passive aggregation

- **Status**: Accepted
- **Date**: 2026-06-08

## Context

Every domain folder under `libs/` and app source roots has an `index.ts` that
re-exports its contents. Choices: explicit named re-exports
(`export { X } from './x'`) or wildcard (`export * from './x'`). Both compile
to roughly the same code; the difference is what a PR diff reveals.

## Decision

Every `index.ts` is `export * from './file'`, one line per source file.
No exceptions.

## Rationale

The barrel is passive transport, not a curated API manifest. Symbol changes
inside a source file (renames, additions, removals) should diff in that source
file only — the barrel forwards whatever the folder publishes, unchanged.
This preserves signal: a barrel diff means structural change (file added,
moved, deleted); a source diff means behavioral or semantic change. Each file
has one reason to change. Internal helpers stay file-local (no `export`
keyword), so leak prevention lives where the symbol is defined — not at the
barrel, which couldn't add what the first gate missed.

## Consequences

- Renames produce single-file diffs, not two-file diffs.
- Reviewers learn barrel diffs mean structural change and pay attention accordingly.
- The API surface of a domain isn't readable from the barrel alone — reviewers
  open source files to see what's exported.

## Alternatives considered

- **Explicit named re-exports as "public API curation"** — rejected; trains
  reviewers to skim every refactor's barrel diff as bookkeeping.
- **No barrels, consumers import deep paths** — rejected; couples consumers
  to internal layout.
