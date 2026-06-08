# FAQ

Why-this-not-that for decisions where alternatives are common questions. Each entry
points to the relevant ADR for full reasoning.

## Why a shared contracts library instead of duplicating types or using a relative path?

The renderer and preload both need to know the shape of `window.api`. With duplicate
declarations, the two sides can silently drift; with a relative import, the dependency
direction inverts and Nx can't enforce it. A standalone library with neither side
depending on the other is the textbook Dependency Inversion answer.

See ADR 001.

## Why three layers of process isolation (runtime + type + lint)?

A single layer is insufficient. The runtime (`contextIsolation: true`, `sandbox: true`,
`nodeIntegration: false`) prevents Node from loading in Chromium. The type system
excludes `"node"` types from the renderer's tsconfig so `fs` doesn't autocomplete.
ESLint `no-restricted-imports` is a third backstop. If one layer is defeated by an
accidental config change, the others still catch it.

See ADR 002.

## Why constants for IPC channel names instead of inline strings?

Inline strings can be typo'd independently on either side of the wire. The renderer
hangs waiting for a response that will never come. Centralized constants make typos
impossible (literal is referenced, not retyped), renames are type-safe, and the IPC
surface is grep-able as one file.

The same principle applies to all cross-process identifiers — sentinels, payload
limits, version codes — per R-ELECTRON-2.

See ADR 003.

## Why `export *` barrels instead of explicit named re-exports?

Barrels are passive transport, not curated public APIs. With `export *`, a rename
diffs in one file (the source). With named re-exports, every rename diffs two files
(source + barrel). The barrel's stability becomes the signal: a barrel diff means
structural change (file added, removed, moved), not behavioral change.

See ADR 004.

## Why suffix-based file naming?

Folder names tell you _what subject the files describe_. Suffixes tell you _what kind
of artifact each file is_. Together they answer both questions without forcing a
directory split per artifact kind, which would fight against grouping files by domain.

See ADR 005.

## Why HTTP-style numeric codes for IPC errors?

HTTP codes are a widely-known taxonomy. Picking them means new readers already
understand what `403` and `404` signal. Numbers (not strings) because they're
language-agnostic, log-friendly, and allow range checks (`code >= 500` is unexpected).

See ADR 008.

## Why is the file classifier in main, not in contracts or renderer?

The renderer must never reimplement "what is supported" — single source of truth.
Putting it in contracts would force the renderer to know the extension list. Putting
it in main keeps the policy where the filesystem actually lives, with one function
deciding for all files at directory-listing time.

See ADR 007.

## Why not Conventional Commits?

The cost of strict per-commit typing exceeds the value at this team size. Ticket-ID
first-line + symbol-prefixed body lines achieves the same goals (scan value,
machine-readability) with less ceremony. Auto-changelog generation will instead pull
from JIRA fields the PO already owns.

See ADR 006.

## Why MUI?

Five new dependencies covering AppBar, Drawer, Autocomplete, and the tree view in one
ecosystem. Default theme, no customization. The "completeness in one ecosystem" trade
beats composing three separate libraries when there's no strong design opinion to enforce.

The decision is reversible — the file-tree feature wraps `RichTreeView` thinly enough
to swap to `react-arborist` later if virtualization becomes necessary.

## Why lazy tree loading instead of eager walk?

A Paradox mod folder can contain thousands of files. Eager-walking on folder open
freezes the UI on real-world inputs. Lazy loading (depth-1 per expand) matches the
user's actual access pattern: they expand what they care about.

`hasChildren: boolean` on `FsNode` lets the tree show expanders without fetching.

## Why React Router (memory mode)?

Two routes appeared at the same time: the mod-info-edit view (when the
mod root is selected in the tree) and the placeholder view (when nothing
or a file is selected). Router-with-no-routes is ceremony; router-with-
two-routes earns its keep — switching between views without rebuilding
the layout, preserving URL-like state for future deep-linking, and
giving file preview a slot to land into.

Memory mode (not browser mode) because Electron's renderer has no real
URL bar to write back to. Memory mode keeps the routing primitive without
the URL surface.

## Why a "plugin" pattern in a single-author project?

The paired `e-game-{x}` / `r-game-{x}` library pattern is an internal architectural
discipline, not a contract with external plugin developers. Treating each game as if
it were external code is what enforces the layer separation — the host cannot reach
into game-specific concerns and game code cannot leak into the host. The "plugin"
terminology names the discipline, not a deliverable.

See ADR 010.
