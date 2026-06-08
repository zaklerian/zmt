# ZMT Architecture

This document describes the runtime architecture of ZMT and the boundaries between
its components. For why specific decisions were made, see `docs/adr/`.

## Runtime topology

ZMT is an Electron application with three distinct runtime contexts plus shared
libraries:

```
┌─────────────────────┐         ┌─────────────────────┐         ┌─────────────────────┐
│   MAIN PROCESS      │         │   PRELOAD SCRIPT    │         │   RENDERER PROCESS  │
│   (Node.js)         │  ◄────► │   (privileged       │  ◄────► │   (Chromium         │
│                     │   IPC   │    bridge)          │ context │    sandbox)         │
│  apps/electron/     │         │  apps/electron/     │  bridge │  apps/zmt/          │
│  src/main/          │         │  src/preload/       │         │                     │
│                     │         │                     │         │                     │
│  • fs, path, os     │         │  • limited Node     │         │  • DOM, fetch       │
│  • child_process    │         │  • contextBridge    │         │  • React 19         │
│  • OS dialogs       │         │  • ipcRenderer      │         │  • NO Node access   │
│  • plugin runtime   │         │    (invoke only)    │         │                     │
└─────────────────────┘         └─────────────────────┘         └─────────────────────┘
         ▲                                ▲                                ▲
         │                                │                                │
         └────────────────────────────────┼────────────────────────────────┘
                                          │
                                ┌─────────▼─────────┐
                                │  libs/contracts   │
                                │  (types + consts) │
                                └───────────────────┘
```

| Process   | Path                         | Runtime           | What it can do                         |
| --------- | ---------------------------- | ----------------- | -------------------------------------- |
| Main      | `apps/electron/src/main/`    | Node.js           | Filesystem, OS integration, IPC server |
| Preload   | `apps/electron/src/preload/` | Privileged bridge | `contextBridge`, `ipcRenderer.invoke`  |
| Renderer  | `apps/zmt/`                  | Chromium sandbox  | React UI; no Node access               |
| Contracts | `libs/contracts/`            | Build-time only   | Shared types and IPC channel constants |

## The boundary

The renderer cannot directly touch the filesystem, the OS, or Electron's main-process
APIs. It communicates with the main process exclusively through IPC, with the contract
defined once in `libs/contracts/`.

The boundary is enforced at **three layers**. See ADR 002.

### Layer 1 — Runtime

In `apps/electron/src/main/factories/create-main-window.factory.ts`:

```ts
webPreferences: {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  devTools: isDevMode(),
}
```

CSP installed via `webRequest.onHeadersReceived`, with separate dev and prod policies.
Navigation guards (`setWindowOpenHandler`, `will-navigate`) prevent navigation away
from the renderer origin.

### Layer 2 — Type system

`apps/zmt/tsconfig.app.json` does not include `"node"` in its `types` field. A renderer
file writing `import fs from 'fs'` fails to compile.

### Layer 3 — Lint

`apps/zmt/eslint.config.mjs` uses `no-restricted-imports` to forbid `electron`, `fs`,
`path`, `os`, `child_process`, `crypto`, and `node:*` patterns. Nx tag-based
`@nx/enforce-module-boundaries` rules add a second wall: the renderer can only depend
on libraries tagged `scope:renderer` or `scope:shared`.

## IPC

The renderer's view of the system is the `window.api` object, typed by the
`AppApiModel` interface from `@contracts`. The bridge from `window.api` to main-process
handlers goes through the preload script.

```ts
// libs/contracts/src/ipc/ipc-channel.const.ts
export const IPC_CHANNELS = {
  fs: {
    listDirectory: 'fs:listDirectory',
    openFolderDialog: 'fs:openFolderDialog',
    readTextFile: 'fs:readTextFile',
    searchFiles: 'fs:searchFiles',
    writeBinaryFile: 'fs:writeBinaryFile',
    writeTextFile: 'fs:writeTextFile',
  },
  plugins: {
    list: 'plugins:list',
  },
  preferences: {
    get: 'preferences:get',
    getAll: 'preferences:getAll',
    set: 'preferences:set',
  },
  system: {
    ping: 'system:ping',
  },
  workspace: {
    closeMod: 'workspace:closeMod',
    get: 'workspace:get',
    openMod: 'workspace:openMod',
  },
} as const;
```

Channel names appear as string literals in exactly one place. Every consumer references
the constant, so renames are type-safe and typos are impossible. The same principle
applies to all cross-process identifiers (sentinels, payload limits, version codes) per
R-ELECTRON-2. See ADR 003.

Errors thrown from main are serialized with a sentinel-prefixed JSON shape, then
deserialized on the renderer side back into a structured `IpcError`. HTTP-style numeric
codes (`400`, `403`, `404`, `500`). See ADR 008.

## The contracts library

`libs/contracts/` is the only sanctioned cross-process surface. Both main and renderer
depend on it; the library depends on nothing. See ADR 001.

Internal organization splits the cross-process surface into domains:

```
libs/contracts/src/
├── api/                          # shape of window.api
├── fs/                           # filesystem domain types
├── ipc/                          # wire identifiers (channels, error model)
├── plugin/                       # cross-process plugin contract
├── preferences/                  # preferences store types
├── workspace/                    # open-mod workspace types
└── index.ts
```

Future contracts become sibling folders, never deeper subdivisions. See ADR 005.

## Library taxonomy

Library names follow a two-part convention: a runtime prefix and a role suffix.

| Prefix | Runtime             |
| ------ | ------------------- |
| `r-`   | renderer (frontend) |
| `e-`   | electron-main       |
| none   | cross-process       |

| Suffix         | Role                                          |
| -------------- | --------------------------------------------- |
| `-core`        | composition glue (e.g. routing, state stores) |
| `-ui`          | UI primitives                                 |
| `-feature-{x}` | feature module                                |
| `-game-{x}`    | game-engine-specific paired library           |

Current libraries:

| Library               | Tags                         |
| --------------------- | ---------------------------- |
| `libs/contracts`      | `scope:shared`, `type:lib`   |
| `libs/paradox-parser` | `scope:shared`, `type:lib`   |
| `libs/e-game-hoi4`    | `scope:main`, `type:lib`     |
| `libs/r-game-hoi4`    | `scope:renderer`, `type:lib` |

Future libraries are created only when the extraction precondition fires
(see ADR 009 and `.claude/PROGRAMMING.md` A-PROJ-1). Until then, code lives in the
consuming app.

## Main process structure

The main process is organized by artifact category:

```
apps/electron/src/main/
├── factories/                          # constructors
├── fs/                                 # filesystem services
├── ipc/                                # wire infrastructure
├── plugins/                            # plugin registry
├── preferences/                        # preferences store
├── setup/                              # app-level wiring
├── workspace/                          # persisted workspace store (open mods + active mod)
└── main.ts                             # entry point
```

The `workspace/` store holds the canonical `Workspace` (`openMods[]` + `activeModId`)
in main, persisted to the same electron-store file as preferences under a `workspace`
key and pruned of missing paths on load. The path guard reads the active mod's path
from it.

`main.ts` is the entry point and the visible startup sequence: `app.whenReady()`
registers lifecycle handlers, then calls `bootstrap()`, which registers IPC handlers,
installs CSP, loads the persisted workspace (pruning missing paths), seeds the default
root in dev (`ZMT_DEFAULT_MODS_PATH`), and creates the window in that order.

## Renderer structure

```
apps/zmt/src/
├── app/
│   ├── layout/                          # AppHeader, AppFooter, AppLayout
│   ├── providers/                       # ThemeProvider + CssBaseline + AppErrorBoundary + ModalProvider + LocaleProvider
│   ├── router/                          # route config
│   ├── shell/                           # AppShell, shell context
│   └── zmt-app.component.tsx            # root
├── features/
│   ├── mod-content/                     # mod browsing
│   ├── mod-info-edit/                   # descriptor.mod editing
│   └── app-settings/                    # app settings (per-game feature toggles)
├── i18n/                                # locale resources, locale provider
├── plugins/                             # renderer-side plugin registry
├── shared/                              # cross-feature primitives
└── main.tsx                             # React render entry
```

## Plugin architecture

ZMT covers multiple Paradox games through a paired-library pattern that enforces
game-scope isolation at the workspace-graph level. The "plugin" terminology names
an internal architectural discipline — treating each game as if it were external
code — rather than an extensibility contract for outside contributors. The
presumed-external stance is what enforces the layer separation: host code cannot
reach into game-specific concerns and game code cannot leak into the host.

Each supported game ships as a pair of Nx libraries — `libs/e-game-{gameId}/` on the
electron-main side and `libs/r-game-{gameId}/` on the renderer side. The main-side
library owns schemas, file ops, and validation; the renderer-side library owns the
forms and entity components that fill host-provided slots. The host (`apps/zmt`)
provides orchestration and slots; per-game libraries do not import from each other.
See ADR 010 for the full reasoning.

Cross-process plugin types live under `libs/contracts/src/plugin/`: `GAME_IDS`,
`FEATURE_IDS`, the `GamePlugin` interface, and `FeatureContribution`. Per-game entity
schemas stay in their respective `e-game-{x}` libraries; where the IPC wire needs to
carry "an entity in some game" generically, the payload is a discriminated union keyed
by `gameId` declared in `@contracts`. User-facing feature toggles are per-game-per-feature
and persisted as isolated keyed entries (`pluginSettings.{gameId}`).

## Stack

- Electron 40 — desktop runtime
- React 19 — renderer UI
- MUI 7 + @mui/x-tree-view 8 — UI components
- TypeScript 5.9 strict — type system across all three processes
- Nx 22 — monorepo orchestration
- Vite 7 — renderer dev server and build
- esbuild — main and preload bundler
- Vitest 4 — tests across all projects
- ESLint flat config — linting
- Husky 9 + lint-staged — pre-commit hook
- GitHub Actions — CI
