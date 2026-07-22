# ZMT-E28 — Technology read-correctness — grounding run report

- **Ticket**: ZMT-E28 — Technology read-correctness: edge kinds, sub-techs, repeated ref-lists
- **Date**: 2026-07-22
- **Harness**: ZMT-23 data-grounding tool (ADR 023), read-side gates; write-side per the ZMT-25 launch model
- **Corpus**: BICE mod fork at `/home/user/test-mod-bice` (resolved via `ZMT_GROUNDING_CORPUS`). Never vendored; never modified.
- **Base**: this ticket stacks on ZMT-26 (`974e606`, PR #76), which is not yet in `main`. See the PR body for the base/stacking note.

## Headline

The technology extractor drops from ZMT-26's inventory land exactly as scoped —
the shrinking baseline is the evidence the model got richer (ADR 023).

- **ADR 022 gate 2 (parse → serialize byte-identity): PASS.** All 4,151 scanned
  `.txt` files — every `common/technologies/*.txt` included — round-trip
  byte-identically. Zero serialize mismatches. (The read model does not drive
  serialization; this confirms the extractor changes touch no bytes.)
- **ADR 022 gate 3 (parse → extract → write via `entity-mutation.service`):
  `OUTSTANDING`.** The write path needs the Electron runtime, absent here (the
  Electron binary is org-policy-blocked through the egress proxy). Reported by
  name, per the ZMT-25 launch model — never `pass`, never silently seeded. The
  committed `coverage-baseline.json` is therefore **not** reseeded by this PR; the
  candidate below is delivered for the local write-side run.
- **Coverage inventory: 558 unmodeled keys** (was 986 at ZMT-26). The delta is
  **428 technology keys removed, nothing added** — see the diff below.
- **Corpus immutability (gate 5): verified** by before/after content hash.

## Coverage delta vs the ZMT-26 candidate (gate 2)

The candidate baseline regenerated over BICE
(`ZMT-E28-candidate-baseline.json`), diffed against the ZMT-26 candidate
(`ZMT-26-candidate-baseline.json`), is a **pure removal** confined to
`technology`:

| Entity type    | ZMT-26 keys | ZMT-E28 keys | Removed | Added |
| -------------- | ----------- | ------------ | ------- | ----- |
| character      | 19          | 19           | 0       | 0     |
| equipment      | 10          | 10           | 0       | 0     |
| ideology       | 1           | 1            | 0       | 0     |
| module         | 7           | 7            | 0       | 0     |
| state          | 13          | 13           | 0       | 0     |
| **technology** | **936**     | **508**      | **428** | **0** |

The 428 removed technology keys are exactly the four ADR 023 drop classes this
ticket models:

- `dependencies.<tech>` — **425 keys** (the `{ <tech> = 1 }` AND-edge form, dropped
  today because `tokenOf` read only bare values; ×425 techs / 1,036 occurrences in
  BICE). Now read as edge targets across every repeated `dependencies` sibling.
- `sub_technologies` — **1 key** (12 occurrences; `air_techs.txt`). Now the
  parent-attached sub-tech node list.
- `XOR` — **1 key** (7 occurrences). Now matched case-insensitively.
- `path.ignore_for_layout` — **1 key** (1 occurrence; `MTG_naval.txt`). Now in the
  modeled `path` scalar allow-list.

Nothing was added to any entity type. The repeated-`dependencies` / repeated-
`enable_equipments` reads (survey #19) surface no distinct baseline key — repeated
same-name blocks collapse to one key path in the inventory — but are covered by the
new-spec fixtures (`extract-technologies.util.spec.ts`) and by reading every
sibling rather than the first.

## What remains unmodeled for `technology` (out of scope)

The 508 remaining keys are the technology **ecosystem** the thin editable surface
never modeled (ADR 021 / R-CODE-5): the `bonus` modifier keys (e.g.
`xp_research_bonus` ×381), `ai_will_do`, `on_research_complete`, `allow`,
`ai_research_weights`, and similar effect/trigger blocks. They carry verbatim
through a save via the lossless node and are correctly reported as unmodeled — not
this ticket's scope.

## Raw harness summary

```
Data-grounding report — PASS
Mode: update-baseline
Corpus: /home/user/test-mod-bice (from env ZMT_GROUNDING_CORPUS)
Files scanned: 4151 (1184 recognized entity files)
Unmodeled keys: 558 total, 0 new since baseline
Round-trip: parse → serialize → byte-identity: all files identical.
            parse → extract → unmodified write via entity-mutation.service:
            BLOCKED — Electron-main write path unavailable (write-side OUTSTANDING).
Corpus immutability (gate 5): verified — no file under the corpus root changed.
```
