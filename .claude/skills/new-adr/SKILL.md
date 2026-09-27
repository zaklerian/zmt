---
name: new-adr
description: Create a ZMT architecture decision record in docs/adr/ — next number, at most 25 lines, Context / Decision / Consequences, plus its ledger line. Use when a decision has more than one defensible answer, spans several parts of the codebase, or is likely to be revisited, or when asked to "write an ADR", "record this decision", or "document why we chose X".
---

# New ADR

Rules: PROC-5, PROC-6, AI-6.

1. Next number: highest `docs/adr/NNN-*.md` plus one, zero-padded to three digits.
2. File `docs/adr/NNN-<kebab-title>.md`, at most 25 lines:
   ```
   # ADR NNN — <Title>

   Status: Accepted · <YYYY-MM-DD>

   ## Context
   <the forces; why a decision is needed now>

   ## Decision
   - <what was decided; cite rule IDs it creates or changes>

   ## Consequences
   - <positive and negative, both stated>
   ```
3. Each ADR stands on its own merits; justify the decision from the current codebase and constraints.
4. A superseding ADR sets the old one's status to `Superseded by NNN`; the old file is kept.
5. If the decision adds or changes rules, edit `.claude/rules/<domain>.md` and `docs/rationale/<DOMAIN>.md` in the same change (AI-3).
6. Add the ledger line with the `ledger-entry` skill.
7. Run `bash .claude/hooks/governance.sh`; it must exit 0.
