# ADR 002 — Renderer layering

Status: Accepted · 2026-09-25 · Amended 2026-09-28 (ZMT-A-D2)

## Context
If components call IPC, hold shared state and render at once, they cannot be tested in isolation and async responses race. The layers must be fixed and checked by tooling, not by habit. The original form gave every layer of every domain its own Nx project; the ZMT-A-1 survey found that produced 38 projects for 6.6 kLOC, most with one consumer, and an Angular build per test target, without adding cohesion.

## Decision
- `*.service.ts` in a `data-access` layer is a thin facade over one preload API namespace and the only IPC caller (STATE-5).
- `*.store.ts` is an NgRx SignalStore in `data-access`. It owns shared state, async status unions and loads via `rxMethod` or `resource()` (STATE-1 to STATE-4).
- Container components live in `feature`: they inject stores and pass signals down.
- Presentational components live in `ui`: `input()`/`output()`/`model()` only, no stores or services (ARCH-2).
- Layers are folders `src/{feature,ui,data-access,util}` inside one Nx project per renderer domain, each folder with its own `@zmt/renderer/<domain>/<layer>` entry point; domain-free utilities live in `libs/renderer/core`.
- Scoped `no-restricted-imports` blocks per layer folder make the split a lint error, and Nx tags (`type:app`, `type:domain`, `type:util`, `type:contracts`) keep the process and library boundaries (ARCH-1).

## Consequences
- Each layer has one test style: services and stores in Vitest, UI through CDK harnesses (TEST-1).
- Async logic exists only in stores, where cancellation is structural.
- A feature spans several folders of one project; the `new-feature` skill scaffolds them.
- Trivial features pay the layering cost too; that is accepted for uniformity.
- The guarantee that `ui` never reaches `data-access` or a store is unchanged; its mechanism moved from the project graph to path-scoped import rules, proven by `tools/eslint-rules/src/layer-boundaries.spec.ts`.
