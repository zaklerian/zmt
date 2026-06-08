# ADR 001 — Shared contracts library

- **Status**: Accepted
- **Date**: 2026-06-08

## Context

Both the renderer (`apps/zmt`) and the preload (`apps/electron/src/preload`) need to
know the shape of the IPC API surface exposed on `window.api`. When the contract lives
in two places — for instance, the preload declaring an object shape inline and the
renderer declaring a `Window.api` type independently — the two declarations can
silently drift.

If the preload adds a method and the renderer's type declaration isn't updated, the
renderer loses type safety on a real, callable surface. The opposite drift (renderer
declares something preload doesn't implement) crashes at runtime with `undefined is
not a function`. The compiler cannot help because each side has its own locally-true
view of the contract.

The general shape: any time a typed surface crosses a process or package boundary, the
consumer's view and the provider's implementation need to be constrained by the same
definition.

## Decision

Extract the IPC contract into `libs/contracts` as a proper Nx library, exported via
the `@contracts` path alias. Both preload (provider) and renderer (consumer) depend on
it. The library depends on nothing.

```
apps/electron/preload  ──┐
                          ├──► libs/contracts
apps/zmt (renderer)    ──┘
```

## Internal organization

Contracts are grouped by domain, not by TypeScript artifact kind:

```
libs/contracts/src/
├── api/          # shape of window.api — renderer-facing contract
├── fs/           # filesystem domain types (FsNode, FileSupport)
├── ipc/          # transport (channel names, IpcError + sentinel)
├── plugin/       # cross-process plugin contract (GamePlugin, etc.)
├── preferences/  # preferences store shape
└── index.ts
```

`api/` is the typed surface the renderer programs against. `ipc/` is the transport
mechanism (channel names that identify messages on the wire, plus the structured
`IpcError` shape that crosses it). `fs/`, `plugin/`, and `preferences/` are domain
groupings.

As the library grows, new domains become sibling folders, never deeper subdivisions.

File suffixes follow the workspace convention: `.model.ts` for type-only definitions,
`.const.ts` for runtime constants. The suffix tells a reader what kind of artifact is
inside before they open the file.

## Consequences

**Positive**

- Single source of truth — contract drift between renderer and preload is impossible
  at the type level
- Nx `enforce-module-boundaries` guards the dependency direction (apps depend on
  libs, libs never depend on apps)
- Clear semantic boundary in the workspace graph
- Future contracts (mod metadata, etc.) have a natural home

**Negative**

- One more Nx project to maintain
- Slightly more import friction (`@contracts` vs a relative path inside one app)
- Adding a new IPC method touches files in two sibling folders (`api/` and `ipc/`),
  not one — the trade-off being that the two folders describe different concepts

## Alternatives considered

- **`shared/` folder inside one app, imported by the other via relative path** — fast,
  but inverts the dependency direction. One app implicitly depends on internals of
  another. Nx can't enforce it.
- **Duplicate the type in both places** — unacceptable drift risk. This is the
  failure mode the library exists to prevent.
- **Single `ipc/` domain colocating both the API shape and the channel constants** —
  defensible. Rejected because "what the renderer can call" and "how the call is
  routed on the wire" are two concepts that just happen to be implemented through the
  same mechanism today. If the transport changed (HTTP, WebSocket, MessagePort), the
  channel-name concept might go away while the API surface stayed.
- **Generate types from a single source (e.g. Zod schemas)** — overengineered for
  current scale. Revisit when contracts need runtime validation, not just static types.
