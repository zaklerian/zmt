---
name: ledger-entry
description: Add a line to the ZMT decision ledger (docs/ledger.md) — date · decision · ADR link, with a revisit trigger for deferrals and a finding tag for recurring review findings. Use when a decision is made, deferred or retired, when a rule changes, when a review finding recurs, or when asked to "log/ledger this decision" or "defer X".
---

# Ledger entry

Rules: PROC-6, PROC-9, AI-6.

1. Append one line at the end of `docs/ledger.md` (oldest first):
   ```
   - YYYY-MM-DD · <decision in one sentence> · [ADR NNN](adr/NNN-title.md)
   ```
   Use `—` in place of the link when no ADR applies.
2. Deferred decision: append ` · revisit: <condition that reopens it>`. The condition names an observable event, not a date guess.
3. Recurring review finding: include `finding:<kebab-slug>` in the decision text. When the slug reaches three lines, the third line names the rule ID that now enforces it (PROC-9); the governance check fails otherwise.
4. Rule added, changed or retired: name the rule ID in the decision text (AI-6, ADR 006).
5. Never edit or delete earlier lines; a reversal is a new line referencing the old date.
6. Run `bash .claude/hooks/governance.sh`; it must exit 0.
