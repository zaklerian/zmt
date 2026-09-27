# ADR 002 — Renderer layering

Status: Accepted · 2026-09-25

## Context
If components call IPC, hold shared state and render at once, they cannot be tested in isolation and async responses race. The layers must be fixed and checked by tooling, not by habit.

## Decision
- `*.service.ts` in a `type:data-access` project is a thin facade over one preload API namespace and the only IPC caller (STATE-5).
- `*.store.ts` is an NgRx SignalStore in `type:data-access`. It owns shared state, async status unions and loads via `rxMethod` or `resource()` (STATE-1 to STATE-4).
- Container components live in `type:feature`: they inject stores and pass signals down.
- Presentational components live in `type:ui`: `input()`/`output()`/`model()` only, no stores or services (ARCH-2).
- Nx tags plus `@nx/enforce-module-boundaries` make the split a lint error (ARCH-1).

## Consequences
- Each layer has one test style: services and stores in Vitest, UI through CDK harnesses (TEST-1).
- Async logic exists only in stores, where cancellation is structural.
- A feature spans several files and projects; the `new-feature` skill scaffolds them.
- Trivial features pay the layering cost too; that is accepted for uniformity.
