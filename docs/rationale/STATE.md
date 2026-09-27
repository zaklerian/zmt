# STATE — rationale

Long-form reasoning for the rules in `.claude/rules/state.md`, keyed by rule ID. Layering decision: ADR 002.

## STATE-1 — Derive, don't sync

State copied from other state by an effect lags by one tick, can loop, and can drift when one side is written directly. `computed()` and `linkedSignal()` express the same relationship declaratively and cannot drift. `effect()` stays for outbound side effects only: logging, persistence, imperative third-party APIs.

The lint rule is type-aware on purpose. It flags `set` and `update` only when the receiver is a `WritableSignal`, so `Map.set`, `FormData.set` and similar calls are out of scope by construction. A selector-based approximation would produce false positives and was rejected. Known gap: a write inside a helper function called from the effect is not seen.

## STATE-2 — Cancellation by construction

Hand-rolled staleness guards (request counters, timestamps compared after an `await`) are easy to get subtly wrong and must be repeated at every call site. `switchMap` inside `rxMethod`, and the built-in cancellation of `resource()`/`rxResource()`, discard superseded requests structurally. Banning `async`/`await` in store files forces loads through one of these primitives. Debouncing lives in the same pipeline, so there is one place per load that controls timing.

## STATE-3 — Status as a union

Independent `loading` and `error` booleans allow four combinations, and one of them (loading with error) is meaningless. A discriminated union makes the valid states the only representable ones. `satisfies never` in the default branch turns a newly added status into a compile error at every switch that does not handle it.

## STATE-4 — SignalStore ownership

State shared across components needs one owner with named transitions, or it gets mutated from several places. SignalStore gives that owner a typed state, computed selectors and methods. Confining `@ngrx/signals` to `type:data-access` projects keeps stores out of UI components and features, which consume them.

## STATE-5 — Service as IPC facade

The preload API is the renderer's only door to the system. Routing every call through one service per namespace gives tests a single seam to mock and keeps IPC payload handling (errors, schema types) in one place per domain. Stores orchestrate, services transport, components render.

## STATE-6 — No invented data

A renderer that fills gaps with plausible defaults shows users data the backend never produced, and bugs in main become invisible. View state may be derived: filtering, sorting, formatting, mapping error codes to messages. Domain values may not be invented. Empty and null states render as visibly empty. This is review-only today. The planned mechanism is typing view models as mapped types over contract outputs, so an invented field fails to type-check.
