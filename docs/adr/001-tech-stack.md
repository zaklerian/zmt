# ADR 001 — Tech stack

Status: Accepted · 2026-09-25

## Context
ZMT is a desktop mod manager for Paradox games. It needs native filesystem access and a form-heavy UI, and its codebase is extended largely by an AI agent, so conventions must be machine-checkable.

## Decision
- Electron shell with three processes: main (Node), preload (bridge), renderer (Chromium).
- Nx monorepo for the project graph, tag boundaries and `affected` targets.
- TypeScript at the ARCH-4 strictness level, repo-wide.
- Angular 22: standalone, zoneless, Signals, native control flow, `input()`/`output()`/`model()`, OnPush default.
- Angular Material (M3) + CDK for components, harnesses and a11y primitives.
- NgRx SignalStore for shared state, Signal Forms for forms, Valibot for IPC schemas.
- Vitest, Playwright (`_electron`) and angular-eslint.

## Consequences
- One reactivity model, signals, from component to store; no zone.js.
- Framework lint presets, generators and MCP servers carry much of the enforcement.
- Current-major choices carry upgrade churn; exact pins (SEC-5) route every upgrade through review.
- Electron's privileged main process demands the trust boundary in ADR 004.
