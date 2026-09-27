# TEST — rationale

Long-form reasoning for the rules in `.claude/rules/test.md`, keyed by rule ID. Strategy decision: ADR 003.

## TEST-1 — Pyramid per layer, from day one

Each layer has a cheapest effective test:
- Stores, services and pure utils are plain TypeScript under Vitest.
- Components are driven through CDK harnesses, which survive template refactors.
- Shared schemas get contract tests that pin the wire format both processes depend on.
- One Playwright `_electron` smoke per feature proves the pieces boot together.

Tests start with the first commit of each layer, because retrofitting tests onto untested code produces tests that encode its bugs.

## TEST-2 — Locale-independent assertions

Tests that find elements by visible text break on copy edits and locale switches, and pass for the wrong reason when a string is reused. Roles, labels and harnesses target semantics. When a test genuinely checks translated output, it sets the locale explicitly so the assumption is visible.

## TEST-3 — Mutation testing at the boundary

Coverage shows code ran, not that a test would notice it breaking. Stryker mutates the code and fails when tests still pass. It is scoped to contracts and main because failures there corrupt files or open the trust boundary. Renderer mutation runs are slow and low-signal. The break threshold turns a drop in test strength into a failing check.
