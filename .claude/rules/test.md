---
paths:
  - "**/*.spec.ts"
  - "apps/*-e2e/**"
  - "stryker.config.*"
---

# TEST — testing

Format: `ID — rule. Why: … Enforced: mechanism (status).` Rationale: `docs/rationale/TEST.md`.

TEST-1 — Every layer is tested from its first commit: Vitest for stores, services and pure utils; CDK component harnesses for components; contract tests for every shared schema; one Playwright `_electron` smoke per feature. Why: each layer gets its cheapest effective test, and gaps cannot accumulate. Enforced: test — per-project Vitest coverage thresholds at 80% (active); hook — governance check requiring a `test` target in every non-e2e project (active); test — the `_electron` smoke suite in `apps/renderer-e2e` launching the built main bundle (active).
TEST-2 — Tests locate elements by role, label or harness and assert locale-independent values; localized text is asserted only after the test sets its locale. Why: tests survive copy edits and locale changes. Enforced: lint — `no-restricted-syntax` on `getByText` in specs (active).
TEST-3 — Stryker mutation testing runs on `libs/contracts` and the main-process projects with a break threshold of 80, and on the `data-access` layer (stores and services) of every renderer domain project with a break threshold of 70. Why: proves that the tests at the trust boundary and in the state layer detect faults instead of merely executing code. Enforced: test — Stryker `thresholds.break: 80` on `contracts` and `main` and `thresholds.break: 70` on the `renderer-*` mutation targets, run by the CI mutation job (active).
