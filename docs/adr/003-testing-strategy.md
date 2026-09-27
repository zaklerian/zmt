# ADR 003 — Testing strategy

Status: Accepted · 2026-09-25

## Context
Most code is written by an agent that is only as reliable as its feedback loop. Tests added late encode existing bugs, and coverage alone does not show whether tests detect faults.

## Decision
- Tests start with the first commit of every layer.
- Pyramid per layer: Vitest for stores, services and pure utils; CDK harnesses for components; contract tests for every shared schema; one Playwright `_electron` smoke per feature (TEST-1).
- Axe-core runs inside every e2e smoke (NG-12).
- Stryker mutation testing covers `libs/contracts` and the main-process projects with a break threshold (TEST-3).
- The Stop hook runs `nx affected -t lint typecheck test` before a task can end (PROC-4).

## Consequences
- The agent gets a failing signal within the task that caused it.
- Mutation testing is kept where defects are costliest (files on disk, the trust boundary). Renderer mutation runs are skipped because they are slow and low-signal.
- Harness-based component tests survive template refactors but need a harness per custom component.
- CI time grows with features; `affected` limits it to changed projects.
