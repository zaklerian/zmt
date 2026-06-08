# Roadmap

Deferred work. Each entry has a status and a brief context note. Items move to
active planning when promoted.

## Status legend

- `Deferred` — known need, not scheduled
- `In discussion` — accepted in principle, revisit on friction or trigger
- `Rejected for now` — actively decided against; conditions for revisit noted
- `Open question` — not yet decided

---

## Renderer & UX

### Mini drawer variant — `Rejected for now (2026-06-08)`

Rail-style collapsed drawer (~48px) instead of full hide. Rejected for now
because the rail has no useful content yet. Promote when there's a "back to tree"
icon, file-quick-actions, or similar that earns rail space.

### Virtualized tree — `In discussion (2026-06-08)`

Current `RichTreeView` does not virtualize. Fine for hundreds of nodes. If a real
Paradox mod with 5k+ expanded nodes shows lag, swap to `react-arborist` or wrap
`RichTreeView` in `react-virtuoso`. The feature wraps the tree thinly enough that
swap is cheap.

### Persisted tree expansion state across launches — `Rejected for now (2026-06-08)`

Within-session expansion persists naturally (state in React); across-launch
persistence is overkill for current value and risks pointing at stale paths.
Revisit on user feedback.

### Persisted last-opened folder — `In discussion (deferred) (2026-06-08)`

`electron-store` or JSON file in `app.getPath('userData')`. Removes the "open folder
every launch" friction. Lands when the right panel makes the cost of re-opening
visible.

### Across-roots search (multi-root) — `Deferred`

Requires multi-mod first. Part of the multi-mod entry below.

### Search across content (not just filenames) — `Deferred`

Filename-only is the ZMT-0.2 contract. Content-search is a separate feature; needs
indexing strategy decision.

---

## Right panel

### Readonly file preview — `In discussion (deferred)`

Renders the selected file: image, text, sanitized HTML. Per file-support enum.

### DOMPurify for HTML preview — `In discussion (deferred)`

HTML files rendered via `dangerouslySetInnerHTML` need DOMPurify wrapping. Not
optional: a `.htm` file in a mod can include `<script>` tags that would call
`window.api.*` from the renderer. Mandatory at first HTML render.

### "Selected folder = file list" view — `In discussion (deferred)`

Temporary scaffolding pending entity-group navigation: real model is entities grouped by
sub-feature with an "Unsupported items" group + fix-folder wizard. File-list is
the stepping stone.

### replace_path editing UX — `In discussion (deferred)`

Currently editable as a raw field via the mod-info-edit form. Plan: per-folder
toggle UI in the directory tree, "treat as full replacement" with a global
default-state app setting that flips per-folder defaults globally. Heuristic
auto-suggestion (vanilla collision detection) deferred until ZMT can locate
vanilla file roots. Re-evaluate when the next entity-edit feature lands.

---

## Editing (deferred)

### Optimistic updates / save state — `In discussion (deferred)`

First real state-management decision. May force a Zustand or similar pick at that
point.

---

## Filesystem awareness

### File watcher for live tree refresh — `In discussion (deferred)`

`chokidar` in main, IPC event channel to renderer. Deferred until file-watch need lands.

---

## Process / infrastructure

### Logging in main — `In discussion (deferred)`

Currently `console.error` in `ipc-handle.util.ts` is the only error-recording site in the main process.
A logger (`electron-log` or `pino`) plus `process.on('unhandledRejection')` /
`uncaughtException` handlers should land before more features depend on observability.

### `chokidar` for file watching — `Deferred`

See "File watcher for live tree refresh" above.

### Changelog generation — `Deferred`

JIRA-custom-field-driven generator, falls back to ticket title, flags gaps for PO.
Design captured in ADR 006.

### `apps/electron/tsconfig.app.json` split — `Deferred`

Split into `tsconfig.main.json` + `tsconfig.preload.json` to reflect their different
runtime capabilities at the type level (main has full Node, preload is partially
sandboxed).

---

## Documentation

### `.claude/` reusability validation — `In discussion`

The `.claude/` framework is project-agnostic by intent. Will be validated when copied
to a second project. Refinement expected after.
