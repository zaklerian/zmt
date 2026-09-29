# ADR 009 — Store events and serialized writes

Status: Accepted · 2026-09-28

## Context
Feature components reacted to a persistent `saveStatus` of `success` inside `effect()`, so a root-provided store re-fired the "saved" snackbar on every route re-entry. Stores fed saves through a `Subject` created in `withMethods` and merged into the load pipeline under `switchMap`: a save before the first load had no subscriber and vanished, and a second save cancelled the observable of a write that still completed on disk, so buffer and file could diverge. The shell diffed a `previousRoot` variable inside an `effect()` to navigate. Events and derived state were modelled as state plus an effect.

## Decision
- A completed action is an event, not state. A store exposes it as an `Observable` named `<event>$` (`saved$`, `saveResult$`, `folderOpened$`), produced by a private `Subject` held in `withProps`; the store is the only producer and consumers subscribe with `takeUntilDestroyed()`. `effect()` stays for outbound synchronisation only (STATE-1).
- Every command is an `rxMethod`. Loads keep `switchMap` (STATE-2). Writes use `concatMap`: they are queued in order and never cancelled, because a cancelled IPC write still completes on disk. A write result is applied to the store, and the event emitted, only for the target the write was issued for; a write with no loaded target is rejected as a renderer-built `400` envelope through the same status and event, so it is visible instead of dropped.
- Child listings of the file tree run through their own `rxMethod` and land only in the tree (root and filter) they were requested for; that scope check replaces the cancellation the in-load `Subject` provided.
- State that is a function of another store's state is a `computed()` over that store, not a refetch (feature navigation over plugins and toggles).

## Consequences
- The snackbar fires once per save, saves cannot diverge from disk, and navigation happens where the folder opens.
- Status unions stay as render state (`saving`, inline errors); the event carries the completion.
- One `Subject` per event lives in a store; it is private by the `_` convention, so no consumer can emit.
- The tree's scope check is a hand-written identity check where cancellation by construction was traded for an independent command pipeline; `@ngrx/signals/events` was not adopted for four one-producer events and is the candidate if event count grows.
