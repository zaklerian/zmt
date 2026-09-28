---
paths:
  - "apps/renderer/**"
  - "libs/renderer/**"
---

# STATE — renderer state and data flow

Format: `ID — rule. Why: … Enforced: mechanism (status).` Rationale: `docs/rationale/STATE.md`.

STATE-1 — `effect()` never writes to a signal; derived state uses `computed()` or `linkedSignal()`. Why: derived state cannot drift or loop, while synced state can. Enforced: lint — type-aware workspace rule in `tools/eslint-rules` flagging `set`/`update` on a `WritableSignal` inside an `effect()` callback (active). DEBT: writes routed through helper functions called from `effect()` go undetected.
STATE-2 — Async loads use `resource()`, `rxResource()` or `rxMethod()` with `switchMap`, and debouncing lives in the same pipeline; hand-rolled request-id or timestamp staleness guards are not written. Why: with cancellation by construction, a stale response cannot overwrite newer state. Enforced: lint — `no-restricted-syntax` on `async` functions and `await` in `*.store.ts` (active).
STATE-3 — Async status is a discriminated union (`idle`, `loading`, `success`, `error`) consumed by exhaustive switches ending in `satisfies never`; boolean loading or error flags are not used. Why: impossible states such as loading-with-error cannot be represented. Enforced: lint — `@typescript-eslint/switch-exhaustiveness-check` + `no-restricted-syntax` on boolean `loading`/`isLoading`/`hasError` state keys (active).
STATE-4 — State shared between components, or with multi-field transitions, lives in an NgRx SignalStore in a `*.store.ts` file inside a `data-access` layer folder; components hold only local UI signals. Why: shared transitions have one auditable owner. Enforced: lint — `no-restricted-imports` of `@ngrx/signals` outside `data-access` layer folders (active).
STATE-5 — A `*.service.ts` in a `data-access` layer folder is the only code that calls the preload API; stores call services, and components call stores. Why: one mockable seam per IPC namespace. Enforced: lint — `no-restricted-properties` on `window.api` outside `*.service.ts` (active).
STATE-6 — The renderer displays IPC data as returned and derives view state from it, without inventing domain values or decorative fallbacks; mapping error codes to messages is allowed. Why: the UI never shows data the backend did not produce. Enforced: review (active). DEBT: view-model types declared as mapped types over contract output types, so invented fields fail to type-check.
