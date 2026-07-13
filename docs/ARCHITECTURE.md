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

Channel names appear as string literals in exactly one place —
`libs/contracts/src/ipc/ipc-channel.const.ts` — grouped by namespace. Every consumer
references the constant, so renames are type-safe and typos are impossible. The same
principle applies to all cross-process identifiers (sentinels, payload limits, version
codes) per R-ELECTRON-2. See ADR 003.

The namespaces divide into infrastructure and entity domains:

| Namespace       | Channels                                                                                                                                       | Role                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `fs`            | `listDirectory`, `readTextFile`, `writeTextFile`, `writeBinaryFile`, `searchFiles`, `openFolderDialog`                                         | Filesystem primitives.                                       |
| `workspace`     | `get`, `addMod`, `removeMod`                                                                                                                   | Included-mod workspace (ADR 013).                            |
| `preferences`   | `get`, `getAll`, `set`                                                                                                                         | Preferences store.                                           |
| `plugins`       | `list`                                                                                                                                         | Registered game plugins.                                     |
| `system`        | `ping`                                                                                                                                         | Liveness.                                                    |
| `entity`        | `write`, `delete`                                                                                                                              | The single typed entity write/delete contract (see below).   |
| `<entity>:list` | `character:list`, `equipment:list` (+ `equipment:slots`), `ideology:list`, `module:list` (+ `module:catalog`), `state:list`, `technology:list` | Per-entity read side — one list channel per listable entity. |

The **entity read side** is one `*:list` channel per listable entity, each returning that
entity's typed projection for the game-agnostic table. The **entity write side** is a
single pair — `entity:write` and `entity:delete` — carrying the typed write contract in
`libs/contracts/src/entity/entity-write.model.ts` (`EntityWriteRequest`, a batch of
scoped `EntityBlockDelta`s; `EntityDeleteRequest`). Read fans out per entity; write funnels
through one channel. See the [Entity editing](#entity-editing) section.

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
├── workspace/                          # persisted workspace store (included mods)
└── main.ts                             # entry point
```

The `workspace/` store holds the canonical `Workspace` (`includedMods[]`) in main,
persisted to the same electron-store file as preferences under a `workspace`
key and pruned of missing paths on load. The active mod — the editable mod whose
root contains the open file — is derived in the renderer, not stored (ADR 013).
The path guard authorizes by each source's `permission`, not by active mod.

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
├── plugins/                             # renderer-side plugin registry (descriptor + recognizer registration)
├── shared/
│   ├── entity-form/                     # entity-agnostic form shell + block renderers + form-descriptor registry
│   ├── modal/                           # modal provider + hook (R-REACT-2)
│   └── …                                # locale-switcher, hooks, react, types
└── main.tsx                             # React render entry
```

`shared/entity-form/` is the host's form infrastructure (ADR 018): the entity-agnostic
shell (`entity-form-shell.component.tsx`), one renderer per block kind
(`property-bag-block`, `named-nested-block`, `list-of-scalars-block`, `object-list-block`,
`keyed-object-map-block`), and the host-side `entityFormRegistry`
(`entity-form-registry.service.ts`) keyed by `(gameId, entityId)`. It is app-shared
infrastructure under `apps/zmt/src/shared/` (A-PROJ-4), not a library — the shell is proven
across its concrete forms rather than gated on A-PROJ-1's third-library-consumer rule.

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

## Entity editing

A Paradox mod is a tree of plain-text script files. ZMT reads recognized entities into
typed tables and lets the user edit a bounded, safe subset of each entity through generated
forms while preserving everything it does not model. The capability splits into a read side
and a write side that evolve independently, joined only by a shared entity-identifier
constant.

### Read side — recognize, list, extract

Rendering an entity list is a three-step chain, one slice per entity under
`libs/r-game-{game}/src/<entity>/` and `libs/e-game-{game}/src/<entity>/`:

1. **Recognizer.** A per-(game, entity) `EntityTableRecognizer`
   (`libs/r-core/src/recognizer/recognizer.model.ts`) answers `matches(filePath)` — does
   this file hold this entity? — and `load(filePath, translate)` — read it into
   `EntityTableData` (columns, rows, default sort, toolbar actions). Recognizers register
   into the host-side `recognizerRegistry`
   (`libs/r-core/src/recognizer/recognizer-registry.service.ts`), which resolves the first
   recognizer whose `matches` returns true for the open file. This read-side registry is the
   write-side registry's sibling; see the retroactive ADR 020.
2. **List channel.** `load` calls the entity's `*:list` IPC channel (e.g. `module:list`),
   whose main handler (`apps/electron/src/main/setup/<entity>-handlers.setup.ts`) delegates
   to a main-side read service (`apps/electron/src/main/<entity>/list-<entity>.service.ts`).
3. **Extraction.** The read service parses the file and runs the game's extraction utility
   (`libs/e-game-{game}/src/<entity>/extract-<entity>.util.ts`) to build the typed entity
   projection declared in `libs/contracts/src/<entity>/`.

Recognizers, descriptors, and locale resources are registered per game through the
renderer plugin (`libs/r-game-hoi4/src/hoi4-renderer-plugin.const.ts`); the main-side plugin
(`libs/e-game-hoi4/src/hoi4-plugin.const.ts`) carries schemas and parser dialects.

### Write side — one atomic mutation service

Every edit funnels through a single main-side write path,
`apps/electron/src/main/fs/entity-mutation.service.ts`, reached only via `entity:write` /
`entity:delete`. It is the sole writer of entity files (ADR 019). Properties:

- **Scoped-delta batch writes.** One save is a batch of `EntityBlockDelta`s
  (`added` / `changed` / `removed` fields under a `block` scope), applied atomically — every
  delta patches and the file is written once, or none patch and the file is untouched.
- **Name + indexed scope segments.** A delta's scope is an ordered path from the entity
  root. A bare-string segment names the sole child block; a `{ name, index }` segment
  selects the index-th same-named sibling — the only form that addresses one of N repeated
  blocks (an object-list item). A multi-element path reaches a grandchild
  (`['portraits', 'army']`), bounded by the form layer's two-level nesting cap.
- **Item-surgical edits.** Only the addressed block's changed bytes are rewritten. Comments,
  trivia, sibling blocks, and everything the descriptor does not model are left
  byte-identical — the editor is lossless by construction.
- **Batch-coordinated intermediate materialization.** An added-only delta whose intermediate
  block is absent (e.g. `['buildings', 'naval_base']` on a state with no `buildings` block)
  materializes the missing tail. Deltas in one batch that share an absent prefix coalesce
  into a single created block rather than one per delta.

### Form shell and the form-descriptor registry

Editing is driven by the entity-agnostic form shell and a per-(game, entity) form-descriptor
registry, both host-side (ADR 018):

- An **`EntityFormDescriptor`** (`libs/r-core/src/entity-form/entity-form.model.ts`) is a code
  module — the write-side mirror of a recognizer — that `project`s a typed subject into an
  **`EntityFormModel`** (blocks + `save` + dialog/error chrome). Descriptors register into the
  host-side `entityFormRegistry`
  (`apps/zmt/src/shared/entity-form/entity-form-registry.service.ts`), keyed by
  `(gameId, entityId)`. `defineEntityFormDescriptor` gives the projection a typed subject while
  the registry stores it type-erased.
- The **shell** (`entity-form-shell.component.tsx`) renders the blocks, wires React Hook Form,
  tracks dirty state, runs the Zod resolver (generated from field specs, or an
  externally-supplied schema for the mod-descriptor path), guards unsaved changes (R-REACT-2),
  and dispatches `save`. It carries no entity-specific knowledge.
- The two registries share only the **entity-identifier constant**
  (`<entity>-entity-id.const.ts`, e.g. `MODULE_ENTITY_ID = 'hoi4-module'`): a recognizer's
  `id` equals its descriptor's `entityId`. This keeps read and write keyed identically while
  letting a type be listable without being editable.

### The block palette

A descriptor composes an `EntityFormModel` from a fixed set of block kinds
(`libs/r-core/src/entity-form/entity-form-block.model.ts`); each block pairs a render shape
with a write scope:

| Block                | Shape                                                                                                                                                                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Property bag**     | Flat `key → scalar` rows. `open` mode = free bag with combobox keys drawn from a curated known-key set plus add/remove; `fixed` mode = a closed set of named scalar fields.                                                                                         |
| **Named nested**     | A named child rendered as a `key → scalar` map, one level deep. May also carry list-of-scalars children, one bounded second level of named-scalar children (`portraits → army → large`), and — opt-in via `editableKeyedMap` — an editable variable-key object map. |
| **List of scalars**  | Bare value tokens bound to one key (e.g. a character's `traits`).                                                                                                                                                                                                   |
| **Object list**      | Repeated same-named blocks (e.g. `path`), items positional, rendered as add/remove item cards; each item is scalar fields plus optionally ONE nested named-object (`folder`'s `position`) within the two-level cap.                                                 |
| **Keyed object map** | An editable variable-key `<key> = { … }` map. Each entry's value is EITHER a fixed-field template OR an open **prop-bag** (chosen per descriptor); add / remove / rename-by-(remove-old + add-new).                                                                 |

A field spec (`field-spec.model.ts`) is a bare name or a name plus a closed validation
vocabulary (`required`, `type`, `min`/`max`, `pattern`, `enum`) that lowers to Zod. The
vocabulary is deliberately not a general validation language.

### The field-classification principle

The reconciliation (which corrected several entity shapes against real mod data) settled the
rule that decides what a descriptor models versus carries: **a flat, open `key → scalar` map
is editable ML surface — an open prop-bag — while nested maps-of-maps and script trees stay
lossless.** The boundary is **structural, not semantic**: a descriptor does not decide by an
entity's meaning whether a region is editable; it decides by the region's shape. Flat scalar
maps (build costs, modifiers, per-province building levels) become prop-bags; anything nested
past that line — condition/effect blocks, script trees, deeper maps — is preserved verbatim in
the lossless parsed node and round-trips untouched (ADR 018 point 5). This keeps the layer
honest about what a single file can know without cross-entity context.

### Reachable editable entities (hoi4)

Seven entities are ML-editable today, their shapes grounded in real mod data by the
reconciliation:

| Entity             | Editable surface (post-reconciliation)                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **module**         | Root scalars + stat blocks + `build_cost_resources` / `dismantle_cost_resources` as open prop-bags. The clean full slice.                                                                               |
| **plane**          | Air-equipment scalars. Rides the shared equipment read side (no separate recognizer); editable via `PLANE_FORM_DESCRIPTOR`.                                                                             |
| **mod-descriptor** | `descriptor.mod` metadata. Host feature (`apps/zmt/src/features/mod-info-edit/`) building an `EntityFormModel` directly and validating via the plugin-supplied Zod schema, not a registered descriptor. |
| **character**      | Metadata + role blocks with `traits` lists + a two-level `portraits → <group> → <key>` nesting + an `enum` field.                                                                                       |
| **technology**     | Metadata + `path` / `folder` object-lists + reference lists. Intentionally thin — bonus maps stay lossless (ADR 021).                                                                                   |
| **state**          | Root scalars + `buildings` (open building → level) + per-province building maps (keyed-object-map, prop-bag entries) + history. Rooted under `history/`, not `common/`.                                 |
| **ideology**       | Metadata + rule/modifier prop-bags + `types` subideologies as an editable keyed-object-map with open modifier-map (prop-bag) entries.                                                                   |

## Documentation map

Three navigational documents divide the labor; each links to the others and none duplicates
another's content.

| Document                     | Layer                       | Answers                                                                                                                                                                                                      |
| ---------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`.claude/PROJECT-MAP.md`** | Always-loaded index         | _Where do I go, and what do I copy?_ Folder→purpose coverage + a task→location index carrying prescriptive golden references (the exemplar to COPY per task). Loaded every session alongside the rule files. |
| **`docs/ARCHITECTURE.md`**   | Narrative (this document)   | _How do the layers fit, and why?_ The runtime topology, the boundary, and how read/write/form pieces compose.                                                                                                |
| **`docs/ZMT-CODE-MAP.md`**   | Point-in-time file topology | _Which file holds this responsibility, right now?_ The per-file depth this narrative defers to.                                                                                                              |

The split: the **project map** is the prescriptive, always-in-context "where / what to copy"
layer and is the authority on folder purpose and golden references (R-WORK-15 keeps it from
lagging the tree). **ARCHITECTURE.md** is the narrative — it explains the shape without
enumerating every file. **ZMT-CODE-MAP.md** is the file-by-file topology snapshot that the
narrative points to for exact locations. When these disagree, the project map wins on folder
purpose and exemplars; ARCHITECTURE.md wins on how-and-why; ZMT-CODE-MAP.md wins on
current-file-location.

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
