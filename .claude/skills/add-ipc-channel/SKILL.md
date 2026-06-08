---
name: add-ipc-channel
description: >
  Use this skill whenever the user asks to add a new IPC channel between
  Electron's main process and the renderer. Triggers: "add an IPC
  channel for X", "expose Y to the renderer", "wire up a new fs:
  something call", "add a preferences method", or any request that
  adds a method to AppApiModel. The skill walks through the four-file
  coordinated edit required for type-safe IPC and points at the
  exemplar file. Always apply this skill for IPC channel work even
  if the user does not explicitly use the word "skill".
---

# Add IPC channel

Adding a new IPC method requires four files updated in coordination.
Missing any one of them produces silent type mismatches or runtime
"undefined is not a function" failures.

## Exemplar

`apps/electron/src/main/fs/read-file.service.ts` plus it is wiring in
`apps/electron/src/main/setup/fs-handlers.setup.ts` and
`apps/electron/src/preload/preload.ts`. Match this style.

## The four-file edit

1. **Channel constant** — `libs/contracts/src/ipc/ipc-channel.const.ts`.
   Add to the appropriate namespace block. Channel names follow
   `namespace:methodName` pattern (verb-prefixed for fs operations).

2. **API method signature** — `libs/contracts/src/api/app-api.model.ts`.
   Add the method to the right namespace in AppApiModel. Members are
   readonly per R-TS-4. Return type matches what main resolves with;
   errors round-trip as IpcError.

3. **Main handler** — `apps/electron/src/main/setup/{namespace}-handlers.setup.ts`.
   Use `ipcHandle<TResult>` from `../ipc`. Validate args at the wire
   (use `requireString` etc.). Throw structured `IpcError` per
   ADR 008. If the operation touches the filesystem, the service it
   delegates to calls `assertPathUnderRoot` first per A-ELECTRON-2 —
   the guard lives in the `*.service.ts`, not in the handler.

4. **Preload exposure** — `apps/electron/src/preload/preload.ts`.
   Wrap with `invokeStructured<TResult>` from `./ipc-invoke.util`.
   The whole API object is typed as `satisfies AppApiModel`, so
   missing methods or signature drift fail at compile.

## Verify

- `nx typecheck contracts electron zmt` is green
- DevTools console: `await window.api.namespace.method(args)` returns
  the expected shape
- Error path: send invalid args, confirm BAD_REQUEST (400) IpcError

## Rule references

R-ELECTRON-2 (channels via @contracts), R-ELECTRON-3 (structured
errors), R-TS-4 (readonly on cross-process types), ADR 003, ADR 008.
