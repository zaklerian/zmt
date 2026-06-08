# Development guide

Day-to-day workflows for working in ZMT.

## Prerequisites

- Node.js 20+
- npm 10+
- A Chromium-compatible OS (Windows, macOS, Linux)

## First-time setup

```bash
git clone <repo-url>
cd zmt-app
npm install
```

The `prepare` script wires Husky on install. The pre-commit hook is active from this
point — staged files run through ESLint and Prettier before commit.

## Running the app

```bash
npm run dev
```

Three processes start in parallel:

1. Vite dev server on `localhost:4200` (renderer)
2. esbuild watch on the main and preload bundles
3. `electronmon` waiting for the renderer + bundles, then launching Electron

The renderer hot-reloads. Main and preload changes trigger an Electron restart.

## Dev convenience: default mod folder

In dev mode, you can pre-seed the active root by exporting `ZMT_DEFAULT_MODS_PATH`
before launch:

```bash
ZMT_DEFAULT_MODS_PATH=/absolute/path/to/HOI4-mods/example-mod npm run dev
```

Or via `.env.local` for repeat use. If unset or pointing at a non-existent path, the
empty-state shows on launch — same as a fresh user.

The env var is read once at startup, only in dev mode (detected via `ZMT_RENDERER_URL`).
Production builds ignore it.

## DevTools

Dev mode opens Chromium DevTools in a detached window automatically. Toggle with F12,
`Ctrl+Shift+I` (Win/Linux), or `Cmd+Opt+I` (macOS). Production builds disable DevTools
entirely via `webPreferences.devTools: false`.

## Per-process work

```bash
npm run dev:zmt              # renderer only, in a browser
nx build electron            # build main + preload once
nx build zmt                 # build renderer once
```

`npm run dev:zmt` serves the renderer alone with no preload, so `window.api` is
`undefined` and any data-loading path throws. Use `npm run dev` for a working app;
keep `dev:zmt` for static UI iteration only.

## Quality checks

Match what CI runs:

```bash
npx nx affected -t lint typecheck test build --parallel=3
```

Per-project:

```bash
nx lint zmt
nx typecheck electron
nx test contracts
nx build zmt
```

Across everything (not just affected):

```bash
npx nx run-many -t lint typecheck test build
```

## Nx graph

```bash
npm run graph                # interactive graph
npx nx affected:graph        # what a change affects
npx nx show project electron --json   # project details
```

## Cache

```bash
npm run reset                # clears the Nx cache
```

First thing to try when a target produces unexpected results, especially after editing
workspace-level files (`tsconfig.base.json`, `nx.json`).

## Starting new work

```bash
git checkout main
git pull
git checkout -b dev/ZMT-N    # or hotfix/ZMT-N
```

The PreToolUse hook at `.claude/hooks/check-branch-name.sh` rejects branches that don't
match `dev/ZMT-` or `hotfix/ZMT-` per R-PROJ-1. Branches not matching `dev/**` or
`hotfix/**` don't trigger CI. See CONTRIBUTING for branch and commit conventions.

## Adding a new IPC method

Four files in coordinated edit. Quick checklist:

1. Channel name → `libs/contracts/src/ipc/ipc-channel.const.ts`
2. Method signature → `libs/contracts/src/api/app-api.model.ts`
3. Handler → `apps/electron/src/main/setup/<namespace>-handlers.setup.ts` (use `ipcHandle`)
4. Preload exposure → `apps/electron/src/preload/preload.ts` (use `invokeStructured`)

`nx typecheck` catches mismatch between contracts (1, 2) and renderer's typed view.
Preload-to-main wire is verified at runtime.

See ADR 003 and ADR 008. The `add-ipc-channel` skill under `.claude/skills/` walks
through the same workflow when CC runs it.

## Adding a new Nx project

```bash
nx g @nx/react:lib my-feature --directory=libs/r-feature-my-feature
```

After generation, edit `project.json` to add `scope:*` and `type:*` tags. Without
tags, the boundary rule rejects all library imports.

Library naming follows the taxonomy in `docs/ARCHITECTURE.md` — prefix `r-` for
renderer, `e-` for electron-main, none for cross-process. Suffix names role
(`-core`, `-ui`, `-feature-{name}`, `-game-{engine}`).

Libraries are created only when the extraction precondition fires (A-PROJ-1, see
ADR 009).

## Debugging the main process

Logs to terminal where `npm run dev` is running. For breakpoints, attach a Node
debugger to the Electron process — VS Code's "Attach to Node Process" picker shows
it as `electron`. The bundled `.vscode/launch.json` provides a "Debug electron with Nx"
launch configuration.

## Debugging the renderer

DevTools opens automatically in dev. React DevTools work if installed.

## Troubleshooting

**"A project without tags matching at least one constraint cannot depend on any libraries"**
— Missing Nx tags. Check `project.json`.

**Pre-commit hook isn't running** — Husky needs `npm install` to have run since the
hook was added. Check `.git/hooks/pre-commit` exists.

**`nx typecheck` passes but the app crashes with `require is not defined`** — A
renderer file is importing a Node module. The type system should catch this, but if
`"node"` accidentally crept back into `apps/zmt/tsconfig.app.json` types, it won't.
Verify the types field, then check the ESLint `no-restricted-imports` rule.

**`window.api.<something>` is `undefined` at runtime** — Preload script doesn't expose
the method. The renderer's view via `AppApiModel` checks at compile-time, but preload
construction is verified at runtime. Check `apps/electron/src/preload/preload.ts`.

**CSP violations in dev console** — Vite injects inline scripts/styles for HMR. The
dev CSP allows `'unsafe-inline'` and `'unsafe-eval'`; prod CSP does not. If you see
CSP violations in dev, check `apps/electron/src/main/setup/install-csp.setup.ts`.

**Stale type errors that don't match the code** — TypeScript's incremental build cache.
Delete `tsconfig.tsbuildinfo` files, or `npm run reset` for everything.
