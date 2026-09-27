---
paths:
  - "**/*.spec.ts"
  - "apps/*-e2e/**"
  - "stryker.config.*"
---

# TEST — testing

Format: `ID — rule. Why: … Enforced: mechanism (status).` Rationale: `docs/rationale/TEST.md`.

TEST-1 — Every layer is tested from its first commit: Vitest for stores, services and pure utils; CDK component harnesses for components; contract tests for every shared schema; one Playwright `_electron` smoke per feature. Why: each layer gets its cheapest effective test, and gaps cannot accumulate. Enforced: test — per-project Vitest coverage thresholds and a required `test` target per project (planned, ZMT-A-2).
TEST-2 — Tests locate elements by role, label or harness and assert locale-independent values; localized text is asserted only after the test sets its locale. Why: tests survive copy edits and locale changes. Enforced: lint — `no-restricted-syntax` on `getByText` in specs (planned, ZMT-A-2).
TEST-3 — Stryker mutation testing runs on `libs/contracts` and the main-process projects with a break threshold. Why: proves that the tests at the trust boundary detect faults instead of merely executing code. Enforced: test — Stryker `thresholds.break` (planned, ZMT-A-2).
