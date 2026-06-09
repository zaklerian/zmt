# ADR 013 — Multi-mod workspace model

- **Status**: Accepted
- **Date**: 2026-06-08

> **Update (2026-06-09, superseded in part by ADR 014):** The `hidden` axis described below was dropped before implementation. Entry visibility is handled by global App Settings toggles (hide vanilla, hide unsupported files), not a per-entry field; `OpenMod` carries `permission` only. The orthogonal-axes reasoning below is retained as the original rationale — the `hidden` field was never built. See ADR 014.

> **Update (2026-06-09, active mod is derived, not stored):** `activeModId` was removed from the persisted `Workspace` and from the IPC shape. The active mod — the mod whose file is currently being edited — is derived in the renderer as the included editable mod whose root contains the open file. Storing it duplicated state already implied by the open file and the included-mods list; deriving it removes that desync class (the same principle this ADR applies to reference-ness and ADR 014 applies to the vanilla projection). The store holds membership (`openMods`) only; focus is computed. Included mods are not nested, so the containing-mod lookup is an unambiguous single prefix match.

## Context

The application opens a single mod root (`currentRoot`) at a time. The next phase
requires several sources open at once — vanilla game files and other mods as read
sources — while editing one mod at a time. The single-root model cannot express
multiple open sources, cannot mark vanilla as read-only, and has no place to record
which open mod is the active editing target.

Two constraints shape the model:

1. Canonical state must live in **main**. The three-layer isolation makes main the
   source of truth; a write-capable collection the renderer could mutate directly would
   defeat the IPC boundary.
2. Vanilla is never a write target.

The open set must also survive restart — restore-on-launch is required behaviour, which
makes the workspace a persisted artifact rather than session state.

## Decision

**Ownership.** Canonical `openMods[]`, `activeMod`, and `activeFile` live in main. The
renderer receives a read-only projection over IPC and never holds write-capable state.

**Collection.** A single ordered `openMods[]`. Order _is_ load-order. The resolution
semantics that consume that order (override merge, conflict handling) are a separate
decision and are not settled here.

**Entry shape.** Each entry carries two orthogonal axes:

```
{
  id:         ModId      // generated, immutable, forever
  name:       string     // mutable attribute
  path:       string     // mutable attribute
  permission: 'editable' | 'readonly'
  hidden:     boolean
}
```

`permission` (can it be written) and `hidden` (is it shown) are independent.

**Reference-ness is derived, not stored.** A reference is any non-active read source;
that falls out of order plus `permission`, so no `role` field is persisted. Vanilla is
synthesized as the always-top entry — `permission: 'readonly'`, first in order — and may
be hidden.

**Identity.** `id` is a generated surrogate key, immutable for the lifetime of the entry.
`name` and `path` are mutable attributes. A `path → id` index answers "is this folder
already open?" for dedup; it is a lookup, not identity. Rename updates `name` and the
index entry, never `id`. Nothing downstream — load-order, `activeMod`, `activeFile`'s
parent reference, per-mod state — keys off a mutable value.

**Active target.** `activeMod` must be an `editable` entry. `activeFile` is optional. When
`activeMod` or `activeFile` is missing at restore, main emits a signal and the renderer
shows a popup; main does not silently substitute another target.

**Persistence.** Workspace state is a `workspace` section in the existing preferences
store (electron-store, `version` and `migrations` already wired): `openMods[]`,
`activeMod`, `activeFile`, active features. The existing `preferences` section is
untouched. The two are split by lifecycle so a future reset-preferences or
multi-workspace feature cannot entangle global config with open-mod state.

**Bootstrapping.** Defaults live in code (Zod `.default()` / a `DEFAULTS` constant). The
store path is chosen by mode — `preferences.json` in prod, `preferences.dev.json` in dev,
branching on `ZMT_RENDERER_URL`. A missing file is materialized from the in-code
defaults; the two mode files never seed from each other. The store is Zod-validated on
load, with corrupt or missing data falling back to defaults.

## Consequences

Positive:

- Single source of truth in main; the renderer cannot author write-capable state.
- Orthogonal `permission`/`hidden` axes make illegal states unrepresentable — hiding an
  entry cannot destroy its write permission, and there is no restore rule to get wrong.
- An immutable surrogate `id` decouples every downstream reference from mutable `name`
  and `path`; rename and re-path are single-field edits with no cascade.
- The versioned store gives a real migration path for future schema changes.

Negative / accepted:

- The IPC surface changes: channels that implicitly operated on `currentRoot` become
  explicit-`ModId` channels. This is a breaking change to the `window.api` contract.
- Moved-mod gap: the `path → id` index is keyed on path, so a mod moved on disk is not
  recognized as the same entry — re-opening it mints a new `id` and strands per-mod state
  tied to the old one. Descriptor-based re-link is deferred.
- Name uniqueness is enforced at the form as a UX rule and is not load-bearing for
  identity.

## Alternatives considered

- **Split `editableMods[]` / `referenceMods[]`.** Rejected. Resolution runs over all
  sources uniformly; two arrays force a re-merge on every path resolve. Role is a
  per-entry capability, not a separate collection.
- **Single `permission: editable | readonly | hidden` enum.** Rejected. Visibility and
  writability are orthogonal; collapsing them means hiding an entry destroys its
  permission and needs a restore rule to recover it.
- **Name as primary key.** Rejected. Mutating a primary key forces a transactional
  cascade across load-order, active references, and per-mod state on every rename. Never
  mutate a primary key.
- **Ship a template file and copy it to seed dev/prod.** Rejected. One file cannot be both
  the shipped default skeleton and the live runtime store — the first write mutates the
  skeleton — and seeding dev from the prod file reintroduces a prod→dev state leak.
  Defaults belong in code; the file holds persisted overrides only.
- **Session-only open set.** Rejected. Restore-on-launch makes the workspace a persisted
  artifact.

## Migration

No persisted root state exists. The current root lives only in an in-memory module
variable (`rootStateService`); the `lastOpenedFolder` preference key is declared but
never written or read. There is therefore nothing to migrate: the `workspace` section
is created from defaults on first write, and the dead `lastOpenedFolder` key is removed
as part of this work.
