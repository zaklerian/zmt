# Decision ledger

Open decisions and explicit deferrals only. Decisions that have landed in code,
ADRs, or rule files are not journaled here — the live artifact is the record.

## Status legend

- `In discussion` — agreed for now; revisit on friction (per R-WORK-8, must
  carry a closure trigger)
- `Rejected for now` — actively decided against; conditions for revisit noted
- `Proposed` — raised but not yet decided
- `Open question` — not yet decided

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

## How to add an entry

When a decision is made in chat or PR review and the decision is NOT immediately
landing in code/ADR/rule (i.e. it's deferred or in-discussion):

1. Pick the next `L-NNN` ID
2. One-line summary
3. Status + date + closure trigger per R-WORK-8
4. If status later becomes `Accepted` and the decision lands in code/ADR/rule,
   remove the entry from this file — the live artifact is the record
