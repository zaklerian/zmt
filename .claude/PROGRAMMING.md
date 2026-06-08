# Working rules — programming

Rules covering how code is written. BASE.md covers how we work together. PROMPTING.md covers CC-targeted prompts. PREFERENCES.md overrides any item by ID.

Order within each section is decision-tree priority: most load-bearing first, style last. Section order: universal code rules → type system → security boundary → renderer → structure.

## Conventions

- `R-{CAT}-{N}` — invariant rule. Breaking it requires explicit override in PREFERENCES.
- `A-{CAT}-{N}` — default approach when multiple options exist.
- Numbers scoped per category; no overlap across categories.
- Categories in this file: CODE, TS, ELECTRON, REACT, PROJ.
- **`(lint)` marker** — a rule ID tagged `(lint)` is enforced in the ESLint configuration. The lint config is the authoritative definition; this prose is a human-readable summary that can lag the config. `(lint, partial)` means lint covers part of the rule and the prose carries the remainder. A rule **without** the tag is enforced only by this prose plus session-start injection — those are the rules that drift if unread, so each is written to stand alone without reference to surrounding code.

---

## CODE — universal

Applies to every line of code regardless of process or framework.

**R-CODE-1.** ESLint or Prettier enforces every rule that lint can express. Prose rules in this file are reserved for things lint cannot catch. The `(lint)` marker (see Conventions) identifies which rules have crossed into lint enforcement; promoting a prose rule to lint is preferred whenever lint can express it.

**R-CODE-2.** Code defaults to zero comments. A comment is added only to flag something a careful reader would miss from names, signatures, and structure — subtle behavior, intentional asymmetry, a gotcha, a version-pin reason, a workaround for an external constraint. TODO and FIXME are exempt; both name a current trigger (a ticket, a condition, a discovery yet to land). When the named trigger resolves without resolving the TODO, the TODO is refreshed to point at a current trigger or removed.

Illustrative of the kind of comment that earns its place (hypothetical, not citations of comments currently in the tree): "Synchronous truth via ref; useState copy drives render"; "Cross-filesystem rename loses atomicity on POSIX — temp file must be in same directory"; "electron-store is ESM-only at the next major; pinned to the last CJS line per R-CODE-4".

**R-CODE-3.** Dependencies pin to exact versions. No `^` (caret) or `~` (tilde) ranges in `package.json`. Auto-patch is the documented attack vector in published supply-chain incidents (colors.js, event-stream, ua-parser-js): a maintainer injects a malicious patch and ships a major release shortly after to obscure it. Exact pinning routes every dep change through deliberate review. The `.npmrc` enforces `save-exact=true` so new installs default to exact.

**R-CODE-4.** Dependency version selection prioritizes stability over recency. Choose the highest version that integrates without friction (module format, peer deps, breaking changes). Newer versions are not preferred for their own sake. When a newer version forces architectural changes (ESM-only when CJS is required, breaking peer deps), pin to the last stable version that fits and record the reason in the relevant ADR.

**R-CODE-5.** Frontend renders backend responses directly. Display-only fallbacks, decorative defaults, and computed values that don't appear in the response are forbidden in the renderer. Empty / null / zero states surface directly; the renderer shapes them visually (placeholder, dash, "—") but does not invent data. Translation of error codes to user-facing messages at the display layer is permitted because the translation is mapping, not invention.

**R-CODE-6 (lint).** Promise rejections reach a handler that surfaces failure to user state or to a log. `void` on a rejection-producing call is acceptable only when the rejection path is identical to the success path — fire-and-forget telemetry, optional analytics. UI handlers that affect what the user sees attach `.catch` or `await` + `try`/`catch`. Enforced via `@typescript-eslint/no-floating-promises`; a deliberate fire-and-forget is marked with the `void` operator, which the rule accepts.

**R-CODE-7.** Tests assert on locale-independent surfaces (semantic queries, ARIA roles, label text via i18n keys) when the asserted text is localizable. Text-content assertions on localized strings are acceptable only when the test sets the locale explicitly or documents the assumed locale in a comment.

**R-CODE-8.** Services exporting two or more methods that share a domain export as a `const x = { method1, method2, ... }` object. Single-function modules export the function directly. The const-object shape unifies main-side and renderer-side service surfaces and makes "service X" greppable as one symbol.

**R-CODE-9 (lint).** Alphabetical ordering is the default where no inherent
sequence exists. The `(lint)` guarantee covers object keys and JSX props only;
array-literal element order is prose-only (not lint-enforced) and applies solely
to arrays whose elements have no meaningful sequence.

- **Functions in a file.** Two alphabetical groups — non-exported helpers first,
  exported functions second. Default export last if used. (prose-only)
- **JSX props.** Reserved props (`key`, `ref`) first, non-event props alphabetical,
  event props (`on*`) alphabetical at the end. Lint-enforced via
  `react/jsx-sort-props` with `callbacksLast: true`.
- **Object keys.** Alphabetical unless semantic order matters (Zod schema field
  declarations, declared interface ordering, lifecycle stages, parser phases). The
  perfectionist `sort-objects` rule is authoritative; a genuine semantic order
  requires an inline `eslint-disable` with justification, otherwise alphabetical
  applies. Lint-enforced.
- **Array literals.** Alphabetical only when the elements carry no inherent
  sequence (e.g. a set of independent key names). Arrays whose order is meaningful
  — field display order, locale precedence, load order — keep their order. NOT
  lint-enforced; `sort-objects` does not see array elements.
- **Imports.** Grouped (node built-ins, external packages, internal `@*` aliases,
  relative paths). Alphabetical within each group.
- **Switch cases.** Alphabetical when no inherent sequence; preserve sequence when
  one exists. (prose-only)

The trade-off this rule accepts: predictability over importance-first ordering.
AI-collaborative code-completion improves when structure is consistent. Where
lint enforces (object keys, JSX props), an `eslint-disable` with justification is
the only escape. Where prose governs (functions, arrays, switch), the same
justification standard applies at review.

---

## TS — TypeScript

**R-TS-1.** `strict: true` is non-negotiable.

**R-TS-2 (lint, partial).** Prefer `satisfies` over `as` for type assertions. `as` only when widening to a less precise type is intentional. Lint catches unnecessary assertions via `@typescript-eslint/no-unnecessary-type-assertion`; the prose carries the `satisfies`-over-`as` preference and the intentional-widening exception, which lint cannot express.

**R-TS-3 (lint).** Use `const` object + `keyof typeof` derived union over TypeScript `enum`. Enforced via `no-restricted-syntax` on `TSEnumDeclaration`.

**R-TS-4 (lint, partial).** In `libs/contracts/**`, `apps/electron/src/main/**`, and `apps/electron/src/preload/**`: all interface and type members are `readonly`. Arrays as `readonly T[]`. Enforced via `@typescript-eslint/prefer-readonly-parameter-types` per P-1.

**R-TS-5 (lint, partial).** In `apps/zmt/src/**`: do not annotate primitive or function-reference props as `readonly`. Annotate reference-type props (arrays, mutable objects, Maps, Sets) as `readonly` when they appear. See P-1.

**A-TS-1.** Use `null` for intentional absence, `undefined` for never-set, empty string only for actual empty content.

**A-TS-2.** When an object's fields vary by a single condition, hoist the condition to a `const` and compute varying fields inline. Apply for up to three varying fields. At four or more, use branched object construction.

---

## ELECTRON — security boundary

Highest-criticality category: violating these rules breaks the renderer/main isolation that the architecture depends on.

**R-ELECTRON-1.** Window security: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. `devTools: isDevMode()`.

**R-ELECTRON-2.** Cross-process identifiers live in `libs/contracts/**`. This includes IPC channel names, error sentinels, payload limits, version codes, and any literal that must be identical on both sides of the wire. Inline duplication across `main/` and `preload/` is forbidden. The compiler enforces consistency: both sides import the same constant. The renderer can pre-check payload limits, recognize sentinels, and bind to channel names without parallel declarations drifting.

**R-ELECTRON-3.** Main handlers throw structured `IpcError` (HTTP-style numeric codes). Serialize at the wire boundary; the renderer always receives a structured shape, never a raw error string. Renderer-side display layer translates codes to user-facing messages per R-CODE-5.

**R-ELECTRON-4.** Any file persisted to `app.getPath('userData')` or any user-writable runtime location splits its filename by mode: `{name}.dev.{ext}` in dev (detected via `ZMT_RENDERER_URL`), `{name}.{ext}` in prod. Applies to config stores, caches, logs, plugin state, and any future runtime-written artifact. Dev experiments must not pollute the production store on the same machine.

**A-ELECTRON-1.** Main process organized into `factories/` (constructors), `setup/` (wiring), `fs/` (filesystem services), `ipc/` (wire infrastructure).

**A-ELECTRON-2.** Path-based security: every filesystem service that accepts a path calls `assertPathUnderRoot()` before touching the filesystem. Handlers delegate to services; the guard lives at the service layer so it holds even on a path that reaches the filesystem without passing through a handler.

---

## REACT — renderer

**R-REACT-1 (lint).** Renderer's only cross-process import surface is `@contracts`. Imports from `electron`, `fs`, `path`, `os`, `child_process`, `crypto`, or `node:*` patterns are forbidden. Enforced via `no-restricted-imports` plus `@nx/enforce-module-boundaries` tags.

**R-REACT-2.** Modals containing forms with unsaved changes prompt for confirmation before closing. Closing without confirmation discards edits, which is acceptable only after the user has explicitly chosen to discard. Applies to dialogs, drawers, and any overlay dismissable by Escape, backdrop click, or close button. Implementation uses the shared modal service exposing reusable `confirm` and `info` methods.

**R-REACT-3.** All user-facing strings in the renderer flow through the i18n `t()` function. JSX text content, visible component props (labels, titles, placeholders, aria-\*), validation messages, parser warnings, and error messages shown to users. Internal strings (console logs, debug-only messages not displayed) are exempt. Adding a new key requires entries in every locale file simultaneously; missing translations are a TypeScript build error, not a runtime fallback. Keys follow the convention documented in CONTRIBUTING.md (namespace prefix + nested camelCase path).

**A-REACT-1.** Components are controlled by default. Selection, value, and similar shared state is owned by the parent.

**A-REACT-2.** Feature folder structure: `components/`, `hooks/`, `services/` as needed. A folder is created only when it holds at least one real file — no empty placeholder folders.

**A-REACT-3.** Use `useReducer` when multiple state pieces transition together or transitions need to be auditable in one place. Otherwise `useState`.

**A-REACT-4.** Debounce via `useEffect` cleanup + `setTimeout`. No external debounce library.

---

## PROJ — project structure

Workflow gates first (branches, commits), organization after.

**R-PROJ-1.** Branches: `dev/ZMT-N` or `hotfix/ZMT-N`. Main is protected. Enforced structurally by `.claude/hooks/check-branch-name.sh`; R-WORK-4 covers cases the hook doesn't.

**R-PROJ-2.** Commit messages: first line is ticket ID. Body uses symbols `+` `-` `*` `~` `!`. See `docs/CONTRIBUTING.md`.

**R-PROJ-3.** File suffixes name the artifact kind. Catalogue lives in `docs/adr/005-file-naming-and-suffix-conventions.md`.

**R-PROJ-4.** Folder names: `kebab-case`. Singular for domains; plural for collections.

**R-PROJ-5.** Every `index.ts` is `export * from './file'` per source file. No explicit named re-exports.

**R-PROJ-6.** Group files by subject domain (not by artifact kind) inside libraries and feature areas. Main process plumbing folders are the exception (collection grouping).

**R-PROJ-7.** Feature folder name describes the domain noun the feature owns, not the primary export or the rendering shape.

**A-PROJ-1.** **Library extraction (rule of three).** Extract a component, service, or hook to a shared library when a third concrete consumer exists or is in active development. The third-consumer precondition IS the gate, not one criterion of four — if it fails, stay in feature; the other criteria are not evaluated. If precondition met, verify: stable surface, domain-free core, style worth sharing. Otherwise stay in feature; revisit on the next consumer.

**A-PROJ-2.** Library naming: `r-` for renderer, `e-` for electron-main, no prefix for cross-process (`contracts`). Suffix names role: `-ui`, `-core`, `-feature-{name}`, `-game-{engine}`.

**A-PROJ-3.** When implementing a decision, flag inline only if the decision actively _blocks_ a future multi-mod feature (requires redesign, not modification). A single-root field becoming a map of roots is not a blocker. A URL/route shape with no slot to disambiguate which mod is a blocker. Don't speculatively accommodate.

**A-PROJ-4.** Renderer-side `shared/` follows the same domain-vs-collection split as R-PROJ-6. A subfolder is a **domain folder** (singular noun) when its files share a concept — provider, hook, model, and component that together implement one capability (e.g. `shared/modal/`). It is a **collection folder** (plural artifact name) when its files share only an artifact kind with no common subject (e.g. `shared/hooks/`, `shared/react/`). Promote a collection folder to one or more domain folders once a coherent subject emerges; until then a collection bucket is preferable to splitting a single utility into its own domain folder.
