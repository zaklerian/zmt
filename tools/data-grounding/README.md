# data-grounding

The data-grounding harness (ADR 023). It compares **what a real mod's files say**
against **what the model learns from them** — the one check in the repo that
compares the file to the model rather than the model to itself. It is local
pre-merge tooling, not application code and not a CI job (ADR 023 decision 5).

## What it does

Over a configured mod corpus, for every parseable (`.txt`) file:

1. **Round-trip** — `parse → serialize → assert byte-identical to source`, and
   (where an Electron runtime is available) `parse → extract → write an unmodified
entity through the real `entity-mutation.service` → assert byte-identical`.
   Failures are reported with a path and a diff; one broken file never aborts the
   run.
2. **Coverage** — for every entity block the extractors recognize, the set
   difference between keys present in the source block and keys projected into the
   model, grouped by entity type and key path, with occurrence counts and an
   example `file:line`. Nested keys use dotted paths (`folder.position.x`). Symbol
   definitions (`@NAME = …`) are never counted (ADR 022 decision 7).
3. **Baseline ratchet** — the run fails only on an unmodeled key **not** in
   `baseline/coverage-baseline.json`. Keys in the baseline no longer seen are
   reported as stale but never fail (the corpus is configuration and may differ).

Nothing under the corpus root is written to; immutability is **verified** (a
content hash of every file, before and after) rather than asserted.

## Configuring the corpus

The corpus root is a real mod on disk — never vendored into the repo. Set it one
of two ways (env wins):

- **Environment variable** (preferred; ephemeral, absent by default so an
  unconfigured run fails loudly):

  ```sh
  ZMT_GROUNDING_CORPUS=/absolute/path/to/mod nx run data-grounding:grounding
  ```

- **Gitignored local file** (convenient for repeated local runs) —
  `tools/data-grounding/corpus.local.json`:

  ```json
  { "root": "/absolute/path/to/mod" }
  ```

The corpus is the BICE mod fork (ADR 023 decision 7).

## Running

```sh
# Verify against the committed baseline (fails on new-since-baseline keys).
nx run data-grounding:grounding

# Regenerate the baseline from the current corpus (a reviewable diff).
nx run data-grounding:update-baseline
```

Each run prints a Markdown report (lead: pass/fail and what is new since the
baseline) and writes it to `tools/data-grounding/last-report.md` for pasting into a
PR body.

## The baseline

`baseline/coverage-baseline.json` lists currently-known-unmodeled keys, keyed by
entity type and key path, each with a first-sighting `file:line` and an occurrence
count. The count/example are informational; the ratchet compares the **set** of
`(entity type, key path)` only. Widen it with `update-baseline` — a diff to it is a
claim that a newly-seen key is intentionally unmodeled, and is reviewed as such.
