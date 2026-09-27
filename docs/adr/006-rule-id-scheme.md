# ADR 006 — Rule-ID scheme

Status: Accepted · 2026-09-25

## Context
Rules are cited in prompts, reviews, lint override names and rationale. Citations need a stable key that also tells the reader where the rule applies.

## Decision
- ID format `DOMAIN-N`, numbered from 1 within each domain.
- Domains:
  - ARCH (structure), NG (Angular), STATE (renderer state), TEST (tests).
  - SEC (boundary, supply chain), PROC (process), AI (agent behaviour), I18N (localisation).
- One rule per line in `.claude/rules/<domain>.md`: `ID — rule. Why: … Enforced: mechanism (status).`
- Each ID has exactly one `## ID — title` section in `docs/rationale/<DOMAIN>.md`.
- IDs are never reused. A retired rule's line is removed, and its ledger line records the retirement.
- Rule edits follow AI-6: a changed rule gets a ledger line.

## Consequences
- The domain prefix shows scope without opening the file.
- Uniqueness and rule/rationale parity are checked by the governance script in the Stop hook.
- Retired IDs leave gaps in numbering; that is the price of stable citations.
