# ADR 014 — Reference / read-only sources and read/write path-guard asymmetry

- **Status**: Accepted
- **Date**: 2026-06-09

## Context

ADR 013 established `includedMods[]` + `activeMod` owned in main, a single editable mod, and a path-guard checking every filesystem target against that one active root. The next phase opens other sources **read-only** — primarily vanilla game files — viewable but never writable. Editing a mod will later resolve against the sources above it in load order (override/merge, deferred to its own decision); this change only establishes the read-only source model and the guard asymmetry that resolution depends on.

Three problems:

1. How does the workspace model express a non-editable source?
2. How does vanilla enter the workspace, given its path is not auto-discoverable?
3. How does the security boundary change when reads span multiple roots but writes must stay confined to one?

## Decision

### 1. `permission` axis on `IncludedMod`

Add `permission: 'editable' | 'readonly'`. Every _persisted_ entry is `'editable'` — users open editable mods only. The axis earns its place by giving the persisted and projected shapes one type; the derived vanilla entry is the only `'readonly'` carrier. (This drops the `hidden` axis ADR 013 specced — see Supersession.)

### 2. Vanilla as a configured, per-game path

The game-folder path is stored per game under `pluginSettings.{gameId}.gameFolderPath`, edited in App Settings directly after the game selector. Unset → no vanilla source, and the field renders empty (R-CODE-5 — no fabricated path).

### 3. Vanilla is derived, not persisted

`includedMods[]` in the store stays mod-only. Main synthesizes the vanilla entry from the configured path when it **projects** the workspace; it is never written into the persisted collection. This mirrors `activeMod` being derived rather than stored — one source of truth for the path (App Settings), no stale entry when the path changes.

### 4. Persisted vs projected `Workspace`

Two shapes. **Persisted** (`workspace` store key) = mods only. **Projected** (`workspace.get()` over IPC) = vanilla-first (`permission: 'readonly'`) then `includedMods`. The projection is authored in main and consumed by both the renderer and the read-guard. `workspace.get()`'s contract becomes "current workspace including derived vanilla," dependent on App Settings game-path state.

### 5. Single-game projection

Vanilla projects for the active game. Exactly one plugin is registered today, and the app already assumes single-game (`plugins[0]`), so "active game" is that plugin. Multi-game — vanilla matching the edited mod's game — requires `IncludedMod.gameId`, an additive modification not a redesign (A-PROJ-3), so it is not built now.

### 6. Path-guard splits into read and write

- **read-guard**: target permitted under _any_ projected source (vanilla + every open mod).
- **write-guard**: target rejected unless under an `'editable'` mod.

The fs services already separate reads (`listDirectory`, `readTextFile`, `searchFiles`) from writes (`writeFileService`), so each service selects the matching guard — no per-call flag. `assertPathUnderRoot` (single active root) becomes two functions over the projected source set.

### 7. Visibility is global toggles, not per-entry

Two independent App Settings toggles: **hide vanilla** (hides the whole read-only vanilla source) and **hide unsupported files** (already shipped, now also applied to vanilla's tree). A file's `support` classification does not depend on which source it lives in, so the filter is uniform.

## Consequences

**Positive**

- Read-only sources are expressible without a parallel collection — `permission` is a per-entry capability.
- Derived vanilla eliminates a desync class: the path has one home, the entry is computed.
- The read/write split makes "many read sources, one write target" a structural property of the guard, not a UI convention.
- The projection split keeps the persisted store honest (only what the user opened) while renderer and guard share one authored view.

**Negative / accepted**

- `workspace.get()` now depends on preferences state (the per-game path), coupling the workspace projection to the preferences store. Accepted — main owns both stores; the alternative splits projection across the IPC boundary.
- Single-game projection is a known temporary simplification; multi-game needs `IncludedMod.gameId` later.
- `hide-unsupported` applied to vanilla filters only after main lists the folder; per-feature vanilla curation (loading only the files a given enabled feature needs, rather than the whole game folder) is deferred and depends on the entity extractor existing first.

## Alternatives considered

- **Persist vanilla as a real `IncludedMod`.** Rejected — duplicates the configured path, drifts when it changes.
- **`hidden` field per entry (ADR 013's original).** Superseded — global toggles cover visibility; a per-entry field has no consumer and would need a restore surface.
- **Renderer composes vanilla from a separate path fetch.** Rejected — splits the projection; the renderer's view could disagree with what the guard authorizes.
- **Defer write-rejection until multiple editable roots exist.** Rejected — without it this change permits writes into vanilla. A hole, not a deferral.
- **Exempt vanilla from `hide-unsupported`.** Rejected — reintroduces the cross-situation inconsistency the option-flag model removed.
