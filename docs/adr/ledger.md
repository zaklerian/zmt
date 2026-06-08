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

## How to add an entry

When a decision is made in chat or PR review and the decision is NOT immediately
landing in code/ADR/rule (i.e. it's deferred or in-discussion):

1. Pick the next `L-NNN` ID
2. One-line summary
3. Status + date + closure trigger per R-WORK-8
4. If status later becomes `Accepted` and the decision lands in code/ADR/rule,
   remove the entry from this file — the live artifact is the record
