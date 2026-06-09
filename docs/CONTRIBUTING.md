# Contributing to ZMT

This document is the practical reference for working in the ZMT codebase. Working
rules for AI collaboration live in `.claude/BASE.md`, `.claude/PROGRAMMING.md`,
`.claude/PROMPTING.md`, and `.claude/PREFERENCES.md`. Decision rationale lives in
`docs/adr/`.

## Getting set up

```bash
npm install
npm run dev          # vite renderer + electron with hot reload
```

The `prepare` script wires Husky on `npm install`. The pre-commit hook runs ESLint
and Prettier on staged files via `lint-staged`.

## Branches

Two patterns only:

- `dev/ZMT-N` — feature work
- `hotfix/ZMT-N` — production fix

Main is protected. Code reaches main only through pull requests that pass CI. Enforced
structurally by `.claude/hooks/check-branch-name.sh` per R-PROJ-1.

## Commits and PRs

**First line: the ticket ID.** Always.

**Body: symbol-prefixed lines** describing what changed.

| Symbol | Meaning         |
| ------ | --------------- |
| `+`    | added           |
| `-`    | removed         |
| `*`    | changed         |
| `~`    | fixed           |
| `!`    | breaking change |

Example:

```
ZMT-0.2
+ features/mod-content with controlled tree component
+ debounced search via useFileSearch hook
+ fs IPC channels (openFolderDialog, getCurrentRoot, listDirectory, searchFiles)
* eslint-config-prettier moved to last position
```

**Cadence:**

- One commit per change (single-line) when changes are independent
- Multi-line body when one logical change touches several pieces

PR titles follow the same first-line rule. Squash-merge to main.

Full rationale: see `docs/adr/006-branching-and-commit-conventions.md`.

## Quality gates

Local (pre-commit):

```bash
# runs automatically via husky on commit
npx lint-staged
```

Full gate (matches CI):

```bash
npx nx affected -t lint typecheck test build --parallel=3
```

A push to any `dev/**` or `hotfix/**` branch runs the gate in CI. A PR against main
re-runs it as the merge gate.

## File and folder conventions

See `docs/adr/005-file-naming-and-suffix-conventions.md` for the full catalogue. Summary:

- Files: `kebab-case`
- Folders: `kebab-case` (singular for domains, plural for collections)
- Suffix names the artifact kind: `.model.ts`, `.const.ts`, `.service.ts`, `.util.ts`,
  `.component.tsx`, `.factory.ts`, `.setup.ts`, `.hook.ts`
- Group by subject domain inside features; collection grouping for main-process plumbing

## Barrel files

Every `index.ts` is `export * from './file'` per source file. No explicit named
re-exports. See `docs/adr/004-barrel-exports-and-naming.md`.

## Architectural boundaries

Three runtime contexts and one shared library:

```
apps/electron/src/main/    ← Node.js process
apps/electron/src/preload/ ← context-isolated bridge
apps/zmt/                  ← Chromium sandbox (renderer)
libs/contracts/            ← types + constants shared across the boundary
```

Enforced three ways:

1. Runtime — `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`
2. Type system — separate `tsconfig.app.json` per process; renderer's `types` field
   excludes `"node"`
3. Lint — Nx tags + `no-restricted-imports`

A renderer file importing `fs` fails at all three layers. See
`docs/adr/002-renderer-process-isolation.md`.

## IPC

See `docs/adr/003-ipc-channel-constants.md` and `docs/adr/008-ipc-error-model.md`.

Adding a new IPC method touches four files in coordinated edit:

1. Channel name — add to `libs/contracts/src/ipc/ipc-channel.const.ts`
2. API shape — add the method signature to `libs/contracts/src/api/app-api.model.ts`
3. Main handler — register in `apps/electron/src/main/setup/<namespace>-handlers.setup.ts`
4. Preload exposure — add the method to the `API` object in
   `apps/electron/src/preload/preload.ts`, calling `invokeStructured` with the channel constant

Per R-ELECTRON-2, all cross-process identifiers — channel names, sentinels, payload
limits, version codes — live in `@contracts`. Both sides import the same constant.

## Localization

ZMT ships in English, German, and Ukrainian. All user-facing strings flow through
react-i18next per R-REACT-3.

### Namespace convention

Three kinds of namespaces:

- `app` — host application strings (header, footer, modals, locale switcher labels,
  common errors). Owned by `apps/zmt/src/i18n/locales/`.
- `feature.<featureName>` — per-feature strings. `<featureName>` is the feature
  folder name in camelCase. Examples: `feature.appSettings`, `feature.modInfoEdit`.
  Owned by `apps/zmt/src/i18n/locales/`.
- `plugin.<gameId>` — per-plugin strings. Examples: `plugin.hoi4`, `plugin.v3`.
  Owned by the corresponding `libs/r-game-<gameId>/` package.

### Key path convention

Within a namespace, keys are camelCase identifiers nested with dots. The namespace
separator is a colon.

Examples:

- `app:header.title`
- `app:footer.localeSwitcher.label`
- `feature.appSettings:form.fields.activeGameId.label`
- `feature.modInfoEdit:form.fields.name.label`
- `feature.modInfoEdit:warnings.parser.title`
- `plugin.hoi4:features.traits.label`

Read: the part before the colon is `who owns this`; the part after is `what within
that scope`. Two delimiters encode the architectural boundary structurally — see
ADR 010 for the analogous pattern in plugin contributions.

### Adding a new key

1. Choose the correct namespace (or create a new feature namespace if none fits).
2. Add the key to the EN locale file first.
3. Add the matching key to the DE and UK locale files. Missing entries fail
   TypeScript compilation.
4. Use the key via `useTranslation(['<namespace>'])` and call
   `t('<namespace>:<key.path>')`.

### Adding a new locale

1. Append the locale code to the `LOCALES` tuple in
   `libs/contracts/src/plugin/locale-resources.model.ts`.
2. Add a locale folder under `apps/zmt/src/i18n/locales/<code>/` with all
   host-owned namespace files matching EN's key shape.
3. For each plugin lib, add a matching `locales/<code>/` folder.
4. Add the locale's native name to `LOCALE_NATIVE_NAMES` in the LocaleSwitcher
   component.

### Internal vs user-facing

- User-facing (must use `t()`): JSX text content, MUI labels, MUI titles, MUI
  placeholders, aria-\* attributes, error messages displayed to the user, validation
  messages, parser warnings surfaced in UI.
- Internal (exempt from `t()`): `console.log`/`warn`/`error`, code comments,
  debug strings only seen by developers, `error.message` strings used in `IpcError`
  before display formatting (those become user-facing only when displayed, and the
  display layer is responsible for translating error codes to user-facing messages).

## Working principles

### Friction is information

When something in the codebase or workflow generates repeated friction, the friction
is a diagnostic. Ask what the cause is before optimizing the friction away. Suppressing
the symptom is usually the wrong move.

### Defense in depth

Every architectural boundary has at least two independent enforcement layers. Runtime
flag plus type system, type system plus lint, lint plus hook. One layer alone fails
quietly; layers compound.

### YAGNI applies to types too

Don't introduce derived types, generic helpers, or abstraction layers until a real
call site needs them.

### No hidden FE logic

The renderer renders what the backend returns. Display-only fallbacks, decorative
defaults, and computed values that don't appear in the response are forbidden. Empty,
null, and zero states surface directly — the UI shapes them visually (placeholder,
dash, "—") but does not invent data. Translation of error codes to user-facing messages
at the display layer is permitted because the translation is mapping, not invention.
See R-CODE-5.

### Calibrated trust boundary

Each layer validates what it can structurally enforce and trusts what it cannot. The
preferences IPC handler validates the KEY (closed set, runtime type-guarded at the
boundary) but trusts the VALUE shape coming through, because the value's structural
type is enforced by TypeScript rather than at runtime. Same pattern in file-write validation (path-guard at runtime, content shape trusted
to TypeScript) and locale resolution (closed-set guard on stored value, browser
language passed through). The pattern is load-bearing across the IPC boundary.
