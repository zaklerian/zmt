# ADR 012 — Code editor: CodeMirror 6

- **Status**: Accepted
- **Date**: 2026-06-08

## Context

The smart editor (release feature F1) renders Paradox-script text
files for direct editing: `.txt`, `.yml`, `.mod`, `.info`. The editor needs:

- Syntax highlighting for Paradox-script (custom language; no existing
  grammar ships with any mainstream editor)
- Line numbers, code folding, search/replace
- Reasonable bundle weight for an Electron app
- Lazy loading — the editor must not appear in the initial renderer chunk
- Extensibility — eventual validation underlines, autocomplete for entity
  references, possibly an LSP bridge

Three editor libraries dominate the space: Monaco (the VS Code editor),
CodeMirror 6, and Ace.

## Decision

Use CodeMirror 6.

The editor wraps in a thin renderer component. CodeMirror's language layer
(`@codemirror/language`) hosts the Paradox-script grammar; the grammar
itself is a separate construction effort and is not specified
by this ADR.

### Why CodeMirror 6 over Monaco

Monaco bundles around 2-3 MB minified+gzipped and ships a web worker per
language. The full package weighs more than the entire current renderer
bundle. Lazy-loading Monaco in Electron is doable but awkward: its module
structure assumes AMD, the worker setup requires Vite-specific
configuration, and the "feature subset" build tooling is poorly documented.

CodeMirror 6 is modular by design. The core editor weighs around 60 KB;
language support, line numbers, search, and other features are separate
packages. Total typical bundle is 100-300 KB depending on enabled features.
This fits Electron's "ship a real desktop app" budget cleanly.

CodeMirror 6's API is more direct for the language work needed. Defining
a Paradox-script highlighter in CodeMirror is a few hundred lines using
`@lezer/highlight`. The same work in Monaco requires a Monarch grammar
plus significant worker plumbing.

### Why not Ace

Ace is older (the version line dates to 2010), its modularity is weaker,
and its TypeScript story is third-party-patched rather than first-class.
Bundle weight is comparable to CodeMirror 6, but the modern APIs are not.
The decision now sets the editor for years; CodeMirror 6's architecture
matches that horizon.

### The R-WORK-13 pin

Editor choice has a long failure-mode tail. Realized cost may diverge from
estimated cost in either direction:

- Worse than estimated: grammar work proves harder than expected;
  lazy-loading pattern conflicts with Vite's chunking; LSP bridge
  requirement appears and forces a rewrite to Monaco's worker model.
- Better than estimated: CodeMirror's modularity keeps the codebase
  smaller than projected; the pattern is worth reusing.

Per R-WORK-13, the first feature retro that exercises the editor re-examines
this decision explicitly: "Did CodeMirror 6 cost what was estimated?" If
divergence is material, ADR 012 returns to the planning chat for amendment
or supersession.

## Consequences

**Positive**

- Bundle weight bounded: editor in the 100-300 KB range instead of
  Monaco's multi-megabyte footprint
- Modular API matches the pay-only-for-what-is-used principle applied
  elsewhere in the codebase (ESLint flat config, no router until two
  routes, lib extraction rule of three)
- Custom Paradox-script grammar via `@lezer/highlight` is in scope at
  reasonable cost
- Strong React integration via `@uiw/react-codemirror` or hand-wired ref
  hook; choice deferred to implementation time

**Negative**

- Smaller out-of-the-box feature set than Monaco — features must be
  explicitly added, in exchange for not shipping unused ones
- Custom Paradox-script grammar is real work; no existing community
  grammar to fork
- If an LSP bridge is needed later, the integration is more hand-wired
  than Monaco's worker-default model. The R-WORK-13 pin covers this
  possibility.

## Alternatives considered

- **Monaco (VS Code editor)** — rejected. Bundle weight is 5-10x larger,
  Vite/Electron integration is awkward, and the Paradox-script grammar
  work (Monarch + worker plumbing) is heavier than CodeMirror's
  `@lezer/highlight` path. Familiarity from VS Code does not outweigh
  the cost at this scale.
- **Ace** — rejected. Older architecture, weaker modularity, third-party
  TypeScript types. Comparable bundle weight to CodeMirror 6 without the
  modern API.
- **`<textarea>` with manual highlight overlay** — rejected outright.
  Re-implements the long tail of editor behavior (selection, undo, IME,
  accessibility) that mature editors handle correctly.
- **Defer the editor decision to editor-feature implementation time** —
  rejected. The choice shapes the grammar work, the bundle budget, and
  the lazy-loading pattern. Deciding at implementation time means
  redoing scaffolding if the choice changes. Recording now and revisiting
  via R-WORK-13 is cheaper than a late pivot.
