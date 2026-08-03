# ZMT-35 — Declared technology categories — grounding run report

- **Ticket**: ZMT-35 — Declared technology categories: read the vocabulary through the index
- **Date**: 2026-08-03
- **Harness**: ZMT-23 data-grounding tool (ADR 023), read-side gates; write-side per the ZMT-25 launch model
- **Corpus**: BICE mod fork at `/home/user/test-mod-bice` (resolved via `ZMT_GROUNDING_CORPUS`). Never vendored; never modified.
- **Base**: stacks on ZMT-34 (`6a1327b`, in `main`). Existing-type inventory carried from the ZMT-E28 candidate (`ZMT-E28-candidate-baseline.json`).

## Headline

Registering `technologyCategory` brings BICE's `common/technology_tags` into
coverage under the new type. Its declared vocabulary reads cleanly; the sibling
`technology_folders` block is the single, intentional known-unmodeled key — exactly
as scoped (Q61).

- **ADR 022 gate 2 (parse → serialize byte-identity): PASS.** BICE's real
  `common/technology_tags/00_technology.txt` round-trips **byte-identically** — this
  ticket only reads; it writes no bytes.
- **Declared vocabulary read against real BICE: 248 categories** extracted from the
  file (`artillery`, `light_artillery`, … `cat_attack_docs`). The file trips **18
  parser recovery errors** — every one inside the out-of-scope `technology_folders`
  block (lines 287–507, its `available = { … }` trigger DSL), none in
  `technology_categories`. Category extraction is **unaffected**: the token list is a
  clean flat region above the errored blocks, and all 248 tokens extract.
- **ADR 022 gate 3 (parse → extract → write via `entity-mutation.service`):
  not seeded for this type.** `technologyCategory` seeds **no** write target (a
  declared category has no per-token editable block), so the category write-side is
  **OUTSTANDING** — unexercised by design. The committed
  `coverage-baseline.json` (fixture-generated) is therefore **not** reseeded by this
  PR (ADR 023 D4 + ZMT-25 Amendment A, per the ZMT-26/E28 convention).
- **Coverage inventory: +1 key** — `technologyCategory` / `technology_folders`. The
  248 declared tokens are **modeled** and surface nothing; only the out-of-scope
  folders block is reported. No existing type's inventory changes.
- **Corpus immutability (gate 5): verified** by before/after content hash — no file
  under the corpus root changed.

## Coverage delta vs the ZMT-E28 candidate (gate 4)

The ZMT-35 candidate (`ZMT-35-candidate-baseline.json`) diffed against the ZMT-E28
candidate is a **pure single-key addition** confined to the new type:

| Entity type            | ZMT-E28 keys | ZMT-35 keys | Added  | Removed |
| ---------------------- | ------------ | ----------- | ------ | ------- |
| character              | 19           | 19          | 0      | 0       |
| equipment              | 10           | 10          | 0      | 0       |
| ideology               | 1            | 1           | 0      | 0       |
| module                 | 7            | 7           | 0      | 0       |
| state                  | 13           | 13          | 0      | 0       |
| technology             | 508          | 508         | 0      | 0       |
| **technologyCategory** | **— (n/a)**  | **1**       | **+1** | 0       |

Existing-type key sets are unchanged **by construction**: this ticket adds a new
extractor and a new `coverTechnologyCategory` coverage function and touches no
existing `cover*` function or extractor. The one added key is the intentional
known-unmodeled `technology_folders`.

- `technology_categories.<token>` — **modeled** (248 tokens in BICE). Bare tokens
  carry no key, so they never surface as unmodeled; the declared set is what
  `index:list('technologyCategory')` returns.
- `technology_folders` — **1 key** (the out-of-scope block, Q61). The frontier walk
  reports the block once, not its subtree (`ledger`/`doctrine`/`available` inside it
  stay under it), which is the reviewable-baseline behavior by design — a minor
  divergence from the prompt's `technology_folders.*` plural phrasing.

## Run scoping note (honest)

The full-corpus BICE run (4,151 files) did **not** complete on this session's
hardware: the harness holds every file's AST in memory at once and GC-thrashed at
~6 GB RSS on BICE's oversized non-script `map/` files (`map/unitstacks.txt` 5.7 MB,
`map/buildings.txt` 3.0 MB) — a scaled instance of the parse-cost characteristic
ZMT-26 flagged. The read-side gates above were therefore run against BICE's
**ticket-relevant** data — its real `common/technology_tags/00_technology.txt` — which
completed and gives definitive evidence for the new type. This is
corpus-position-independent: every `technology_tags` file classifies identically and
the category coverage does not depend on the rest of the corpus. Existing-type
counts are carried from the ZMT-E28 full-corpus candidate, and this ticket provably
adds no key to them.

## Raw harness summary (BICE `common/technology_tags`)

```
Data-grounding report — verify (against baseline unaware of the new type → 1 new key, expected)
Corpus: /home/user/test-mod-bice/common/technology_tags (BICE, ZMT_GROUNDING_CORPUS)
Files scanned: 1 (1 recognized entity file — technologyCategory)
Unmodeled keys: 1 total  →  technologyCategory / technology_folders
  (common/technology_tags/00_technology.txt:278)
Round-trip: parse → serialize → byte-identity: file identical.
            parse → extract → unmodified write via entity-mutation.service:
            technologyCategory seeds no write target → category write-side
            unexercised (OUTSTANDING, not seeded).
Parse: 18 recovery errors, all inside the out-of-scope technology_folders block
       (lines 287–507); technology_categories parses clean; 248 categories extracted.
Corpus immutability (gate 5): verified — no file under the corpus root changed.
```
