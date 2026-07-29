# Decision ledger

Open decisions and explicit deferrals, plus a deliberate trail of closed items.
When a decision lands in code, ADRs, or rule files, its entry is moved to the
"Closed / partially closed" section with its outcome and closing ticket — kept as
a trail, not deleted. The live artifact remains the record of the decision's
substance; the ledger preserves the deferral-and-closure history.

## Status legend

Open statuses describe what is still pending; closed outcomes describe how a
decision resolved. The two are distinct vocabularies — an open row never carries a
closed outcome, and vice versa.

Open-state statuses (for rows under `## Open`):

- `In discussion` — agreed for now; revisit on friction (per R-WORK-8, must
  carry a closure trigger)
- `Rejected for now` — actively decided against; conditions for revisit noted
- `Proposed` — raised but not yet decided
- `Open question` — not yet decided

Closed outcomes (for rows in the "Closed / partially closed" section):

- `Closed` — resolved; the row names the closing ticket and how it landed
- `Partially closed` — resolved in part; the row names what landed and the residual

---

## Open

| ID    | Decision                                       | Status                                    | Date       |
| ----- | ---------------------------------------------- | ----------------------------------------- | ---------- |
| L-001 | DOMPurify for HTML preview                     | In discussion — at first HTML render      | 2026-06-08 |
| L-002 | Chokidar file watcher                          | In discussion — at file-watch need        | 2026-06-08 |
| L-005 | Optimistic updates / state management approach | In discussion — at first save flow        | 2026-06-08 |
| L-007 | Pre-push hook for `.claude/` vs `docs/` sync   | In discussion — at next consistency drift | 2026-06-08 |
| L-009 | Mini drawer variant                            | Rejected for now — at rail content need   | 2026-06-08 |
| L-010 | Across-launch tree expansion persistence       | Rejected for now — at user request        | 2026-06-08 |
| L-011 | Entity rename operation (delete-old-block + insert-new-block; outside the scalar-delta model) | In discussion — at the TL feature-tree "change file of origin" need, or first cross-cut rename need | 2026-06-12 |
| L-012 | Entity create/insert contract (entity:write patches existing blocks only; creating a new named entity needs an insert path — currently keeps the Add action stubbed) | In discussion — required by TL "change file of origin" (move = delete + insert) and by Add | 2026-06-12 |
| L-015 | Symbol management for `@`-substitution constants (add / edit / delete a symbol, and inline a symbol's last value at every call site on delete) — the write-side beyond ADR 022's read + save-time warning | In discussion — at first symbol-editing feature need, or the inline-on-delete requirement | 2026-07-14 |
| L-016 | Parse-diagnostic UI surfacing path (parse diagnostics have no channel to the user today; prerequisite for ADR 022 decision 5's unresolved-reference diagnostic to be observable) | In discussion — at ADR 022 implementation, or the first parse diagnostic that must reach the user | 2026-07-14 |
| L-017 | `.gui` grammar gaps — `%` / `%%` percent literals and `rgb` / `hsv` keyword-tuple blocks, absent from the grammar and out of scope for ADR 022 (`@`-symbols) | In discussion — at the decision that models `.gui` | 2026-07-14 |
| L-018 | Broaden the data-grounding corpus beyond the single BICE mod fork (ADR 023 decision 7 defers this — one real mod is sufficient to detect drops, and broadening is not a precondition for the harness) | Rejected for now — when one mod proves insufficient to surface a class of drop, or at a second ground-truth mod becoming available | 2026-07-21 |
| L-019 | Survey item — air equipment modules are format-valid and absent from BICE (ADR 023 Amendment B: corpus absence is not evidence of non-support; unobserved format features are survey items, tracked against the format not the corpus, and the model is not narrowed to the corpus subset) | Open question — at the decision that surveys/models the equipment-module surface against engine documentation | 2026-07-22 |
| L-020 | Deferred repeated-block first-match-drop remainder (characterized by the ZMT-E27 survey; character bind-collapse **F-a** is handled on its own ticket, this is the rest): (1) **dup-scalar-in-block** — e.g. two `armor_value` in one `multiply_stats`; a data-model limitation, flat `EntityField[]` cannot hold two rows with the same key, so it corrupts on save where it occurs; (2) **module / ideology / state repeated additive blocks** — invisibility, not corruption; the second-plus repeat is dropped from the read; (3) **latent sites** — format-valid repeats BICE does not currently exercise (survey-flagged). All three are off the plane critical path. Recording the class so the knowledge does not evaporate; fixing it is not this ticket. | In discussion — post-S-3 / the `EntityField` data-model refactor, or the first deferred drop that lands on the plane critical path | 2026-07-29 |

## Closed / partially closed (recorded for traceability)

Closed items are retained here as a deliberate trail rather than deleted, so the
deferral-and-closure history is preserved. Each row names its outcome
(`Closed` / `Partially closed`) and the ticket that closed it.

| ID    | Decision                                                                                                                                                                          | Status                                                                                                                                          | Date       |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| L-013 | Module catalog re-parsed on every call (uncached) — `catalog-modules.service` re-enumerated and re-parsed every source per call                                                  | Closed by ZMT-31 (ADR 024 D5/D6) — the source-scoped index caches per entity type with mtime validation on read                                | 2026-07-29 |
| L-014 | "Where modules live" stated twice across the process boundary — `MODULE_DIR` (main-side, `@e-game-hoi4`) vs `MODULE_DIR_SEGMENTS` (renderer `module-recognizer`)                  | Partially closed by ZMT-31 (ADR 024 D2/D6) — folder location now lives once in the entity registry (enumeration side); residual: the renderer `module-recognizer`'s `MODULE_DIR_SEGMENTS` persists as an accepted negative, no recognizer migration | 2026-07-29 |

## How to add an entry

When a decision is made in chat or PR review and the decision is NOT immediately
landing in code/ADR/rule (i.e. it's deferred or in-discussion):

1. Pick the next `L-NNN` ID
2. One-line summary
3. Status + date + closure trigger per R-WORK-8
4. On close — when the decision lands in code/ADR/rule or is otherwise resolved —
   move the entry to the "Closed / partially closed" section with its outcome
   (`Closed` / `Partially closed`), the ticket that closed it, and any residual.
   Closed items are preserved as a trail, not deleted.
