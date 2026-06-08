# ADR 008 — IPC error model

- **Status**: Accepted
- **Date**: 2026-06-08

## Context

Main-process IPC handlers can fail in many ways: bad input, missing file, security
violation, OS error. The renderer needs to know _what_ failed to respond appropriately
(retry, show user message, redirect, etc.).

Two layered problems:

1. **What shape carries the error?** Boolean failure, string message, structured object?
2. **How does the error survive the IPC wire?**

Electron's `ipcRenderer.invoke` rejects with an `Error` whose `message` is a
string-serialized form of whatever main threw. Non-`Error` values (plain objects) get
coerced to `[object Object]`. Structure is destroyed by the transport unless we
explicitly preserve it.

## Decision

### Shape — structured object with HTTP-style numeric codes

```ts
// libs/contracts/src/ipc/ipc-error.model.ts
export const IPC_ERROR_CODES = {
  BAD_REQUEST: 400,
  CONFLICT: 409,
  FORBIDDEN: 403,
  INTERNAL: 500,
  NOT_FOUND: 404,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA: 415,
} as const satisfies Record<string, number>;

export type IpcErrorCode = (typeof IPC_ERROR_CODES)[keyof typeof IPC_ERROR_CODES];

export interface IpcError {
  readonly code: IpcErrorCode;
  readonly message: string;
}
```

Plus a type guard:

```ts
export function isIpcError(value: unknown): value is IpcError { ... }
```

Why HTTP codes:

- Widely-known taxonomy; new readers don't need a glossary
- Numeric (not string) — language-agnostic, log-friendly, range-checkable
  (`code >= 500` is unexpected/internal)
- Composes with web standards if ZMT ever exposes a network layer

Notable mapping: `FORBIDDEN (403)` is the ZMT-specific security boundary. The
renderer asked for a path outside the user-approved root. Not an OS permission error.

### Wire — sentinel-prefixed JSON, parsed in preload

Main wraps every handler with `ipcHandle`, which catches thrown `IpcError` objects and
re-throws them as `Error("IPC_ERROR::" + JSON.stringify(ipcError))`. The sentinel
prefix survives Electron's IPC string serialization.

The sentinel itself, `IPC_ERROR_SENTINEL`, is a cross-process identifier and lives
in `@contracts` per R-ELECTRON-2 — both `ipc-handle.util.ts` (main) and
`ipc-invoke.util.ts` (preload) import the same constant.

```ts
// apps/electron/src/main/ipc/ipc-handle.util.ts
export function ipcHandle<TResult>(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await handler(event, ...args);
    } catch (error) {
      if (isIpcError(error)) {
        throw new Error(`${IPC_ERROR_SENTINEL}${JSON.stringify(error)}`);
      }
      // unexpected — log and wrap as 500
      console.error(`Unexpected error in handler for ${channel}:`, error);
      throw new Error(`${IPC_ERROR_SENTINEL}${JSON.stringify({ code: 500, message: 'Internal error' })}`);
    }
  });
}
```

Preload reverses the process:

```ts
// apps/electron/src/preload/ipc-invoke.util.ts
export async function invokeStructured<T>(channel, ...args): Promise<T> {
  try {
    return await ipcRenderer.invoke(channel, ...args);
  } catch (rawError) {
    throw parseIpcError(rawError); // splits sentinel, JSON.parses, validates with isIpcError
  }
}
```

Renderer code catches a properly-typed `IpcError`. Unknown errors fall back to
`{ code: 500, message: ... }` so the renderer never sees an unstructured shape.

## Consequences

**Positive**

- Errors round-trip cleanly across the IPC boundary
- Renderer can branch on `code` (e.g., 404 shows "deleted", 403 shows "permission")
- Unknown failures become `INTERNAL`; implementation details from main never leak to
  the renderer
- The sentinel mechanism is generic — applies to any handler, not just `fs.*`
- Console-logging unexpected errors in main keeps debugging tractable

**Negative**

- Sentinel-based serialization is a workaround for Electron's IPC limitations. If
  Electron later supports structured-clone for thrown values, this layer can be
  thinner. Not a blocker; just plumbing.
- ~30 extra lines of code (main wrapper + preload parser) vs naive `ipcMain.handle`.
  Worth it.

## Alternatives considered

- **Throw `Error` with descriptive message** — rejected. Renderer can't branch on
  failure type without parsing messages, which is fragile and i18n-hostile.
- **String error codes (`'NOT_FOUND'`)** — defensible. Numbers won because they're
  log-friendly and allow range checks. The choice is mild and reversible.
- **Result types (`{ ok: true, value } | { ok: false, error }`)** — rejected.
  Forces every consumer to pattern-match every call. TypeScript's `Result<T, E>`
  ergonomics are still rough; we have one error path right now, not a tree of typed
  failure modes. YAGNI applies to types.
- **`Error` subclass per code** — rejected. Subclass `instanceof` checks don't
  round-trip cleanly across the context bridge anyway; would need the same
  serialization layer plus extra ceremony.
