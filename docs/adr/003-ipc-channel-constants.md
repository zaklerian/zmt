# ADR 003 — IPC channel constants

- **Status**: Accepted
- **Date**: 2026-06-08

## Context

IPC channels in Electron are identified by string names. The two sides of the wire
must agree:

```ts
// main
ipcMain.handle('system:ping', ...);

// preload
ipcRenderer.invoke('system:ping');
```

Inline strings spread across `main/` and `preload/` create three problems:

1. **Typos break silently.** `'sytem:ping'` in one place and `'system:ping'` in the
   other compiles, lints, and ships. The renderer just hangs waiting for a response
   that will never come.
2. **No audit surface.** "What IPC channels does this app expose?" has no single
   answer — you grep the codebase.
3. **Refactors are unsafe.** Renaming a channel means search-and-replace across
   processes with no compiler help.

## Decision

Channel names live in `libs/contracts/src/ipc/ipc-channel.const.ts` as an `as const`
object:

```ts
export const IPC_CHANNELS = {
  fs: {
    getCurrentRoot: 'fs:getCurrentRoot',
    listDirectory: 'fs:listDirectory',
    openFolderDialog: 'fs:openFolderDialog',
    searchFiles: 'fs:searchFiles',
  },
  system: { ping: 'system:ping' },
} as const;
```

The snippet above is an illustrative excerpt; the live `IPC_CHANNELS` const
carries the full `fs`, `plugins`, `preferences`, and `system` namespaces.

Both processes import from `@contracts`. Handlers in main and invokes in preload
reference the constant, never raw strings.

The renderer-facing shape is declared in `libs/contracts/src/api/app-api.model.ts` as
`AppApiModel`. The wire identifiers in `ipc/` and the typed surface in `api/` are
sibling domains in the same library — see ADR 001 for why they're split.

A derived `IpcChannel` union type is **not** introduced yet. `as const` already gives
every consumer the narrowest literal type via inference. A union alias only earns its
keep when a function needs to accept "any valid channel name" as a parameter — add
`ipc-channel.model.ts` then, not before.

The same single-source-of-truth principle generalizes to all cross-process identifiers
— sentinels, payload limits, version codes. R-ELECTRON-2 encodes the general rule;
this ADR establishes the channel-names application of it.

Error handling at this boundary is described in ADR 008.

## Consequences

**Positive**

- One file to grep when auditing IPC surface area
- Renames are type-safe — TypeScript catches every call site
- Typos in channel names become impossible — the literal is referenced, not retyped
- The IPC surface is documented by the type, not by tribal knowledge

**Negative**

- Slight indirection — `IPC_CHANNELS.fs.listDirectory` reads longer than
  `'fs:listDirectory'`. Worth it.

## Alternatives considered

- **Inline strings** — original approach. Rejected for the reasons above.
- **Derive channel names from the type structure** — clever but adds a build step or
  runtime reflection for negligible benefit at current scale. Revisit only if the
  channel list grows past ~30 entries.
