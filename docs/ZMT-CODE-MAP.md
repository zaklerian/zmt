# ZMT code map

A point-in-time snapshot of the file topology and per-file responsibilities. This is the
depth the two other navigational docs defer to:

- **`.claude/PROJECT-MAP.md`** — folder→purpose coverage and the prescriptive golden
  references (which exemplar to COPY per task). The always-loaded "where do I go / what do I
  copy" layer; it is the authority on folder purpose and exemplars.
- **`docs/ARCHITECTURE.md`** — the narrative: how the layers fit and why.
- **`docs/ZMT-CODE-MAP.md`** (this file) — the file-by-file responsibilities the narrative
  points to.

Where they disagree, the project map wins on folder purpose and exemplars, ARCHITECTURE.md on
how-and-why, this map on current file location. This snapshot reflects the tree after the
data-grounding reconciliation, which corrected several entity shapes against real mod data.
Only `hoi4` ships today; the per-game slices below repeat for each future game.

## Cross-process contracts — `libs/contracts/src/`

The only sanctioned cross-process surface (ADR 001). Depends on nothing.

| Path                                                                                  | Responsibility                                                                                                                                                       |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/`                                                                                | Shape of `window.api` — the `AppApiModel` interface the renderer is typed against.                                                                                   |
| `ipc/ipc-channel.const.ts`                                                            | Every IPC channel name, grouped by namespace (single source of truth, R-ELECTRON-2).                                                                                 |
| `ipc/ipc-error.model.ts`, `ipc-error-sentinel.const.ts`, `max-payload-bytes.const.ts` | Structured `IpcError`, wire sentinel, payload limit (ADR 008).                                                                                                       |
| `entity/entity-write.model.ts`                                                        | The typed entity write/delete contract: `EntityWriteRequest` (batch of scoped `EntityBlockDelta`s), `EntityDeleteRequest`, `EntityField`, `EntityBlockScopeSegment`. |
| `<entity>/` (character, equipment, ideology, module, state, technology)               | The typed projection each `*:list` channel returns (e.g. `module/module-entity.model.ts`). New contracts are sibling folders, never deeper (ADR 005).                |
| `plugin/`                                                                             | `GAME_IDS`, `FEATURE_IDS`, `GamePlugin`, `FeatureContribution` (ADR 010).                                                                                            |
| `fs/`                                                                                 | Filesystem node + file-support types.                                                                                                                                |
| `workspace/`, `preferences/`                                                          | Workspace (`includedMods[]`, ADR 013) and preferences types.                                                                                                         |

## Renderer core — `libs/r-core/src/`

Renderer composition glue, host-side, game-agnostic. Owns the read/write registries' models.

| Path                                        | Responsibility                                                                                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `recognizer/recognizer.model.ts`            | `EntityTableRecognizer` (`matches` / `load`), `EntityTableData`, toolbar-action context types.                                                          |
| `recognizer/recognizer-registry.service.ts` | Host-side `recognizerRegistry` — first-match resolution over registered recognizers (read side).                                                        |
| `entity-form/entity-form.model.ts`          | `EntityFormDescriptor`, `EntityFormModel`, `EntityFormProjectContext`, `defineEntityFormDescriptor`.                                                    |
| `entity-form/entity-form-block.model.ts`    | The block palette: `PropertyBagBlock`, `NamedNestedBlock`, `ListOfScalarsBlock`, `ObjectListBlock`, keyed-object-map types + write-scope segment types. |
| `entity-form/field-spec.model.ts`           | `FieldSpec` + the closed `FieldValidation` vocabulary (`required`/`type`/`min`/`max`/`pattern`/`enum`).                                                 |
| `action/action.model.ts`                    | The business-action abstraction (ADR 015).                                                                                                              |
| `modal/`                                    | Renderer-core modal model (R-REACT-2).                                                                                                                  |

## Paradox parser — `libs/paradox-parser/src/`

| Path   | Responsibility                                                                                                                                                                                             |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cst/` | Concrete syntax tree — lexer/parser. The `Key` rule admits `Identifier`, `StringValue`, or `NumberValue` (unquoted numeric assignment keys, e.g. province ids; ADR 019 STATE amendment).                   |
| `ast/` | AST model, `parse`, `cst-to-ast`, `serialize`, `visit`, `paradox-dialect.const.ts`, `dialects-from-plugins.util.ts`; `__fixtures__/` = parser test inputs. `round-trip.spec.ts` is the losslessness guard. |

## Main process — `apps/electron/src/main/`

Node.js side. Organized by artifact category (A-ELECTRON-1); per-entity read services are the
domain exception.

| Path                                | Responsibility                                                                                                                                                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `main.ts`                           | Entry + startup sequence (`bootstrap()`: register handlers, install CSP, load workspace, seed dev root, create window).                                                                                                                    |
| `fs/entity-mutation.service.ts`     | **The write path** — `entity:write` / `entity:delete`. Scoped-delta batch writes, name + indexed scope segments, item-surgical offset patching, batch-coordinated intermediate materialization (ADR 019). The sole writer of entity files. |
| `fs/` (rest)                        | `read-file`, `write-file`, `list-directory`, `search-files`, `classify-file`, `path-guard.util.ts` (`assertWritable`, A-ELECTRON-2), `equipment-slots.service.ts`.                                                                         |
| `<entity>/list-<entity>.service.ts` | Per-entity read service behind each `*:list` channel (character, equipment, ideology, module, state, technology). `module/catalog-modules.service.ts` backs `module:catalog`; `equipment/` also enumerates + resolves equipment sources.   |
| `setup/<entity>-handlers.setup.ts`  | Per-namespace IPC handler registration; `entity-handlers.setup.ts` wires `entity:write`/`entity:delete`. `__test-utils__/` = handler-spec helpers.                                                                                         |
| `setup/` (rest)                     | `initialize-default-root`, `install-csp`, `register-app-lifecycle`.                                                                                                                                                                        |
| `factories/`                        | Constructors (e.g. `create-main-window.factory.ts` — window security per R-ELECTRON-1).                                                                                                                                                    |
| `ipc/`                              | Wire infrastructure — the `ipcHandle` helper.                                                                                                                                                                                              |
| `plugins/`                          | Main-side plugin registry + init + `known-plugins.const.ts`.                                                                                                                                                                               |
| `resolution/`                       | Load-order resolution + provenance (ADR 016).                                                                                                                                                                                              |
| `workspace/`                        | Persisted workspace store (`includedMods[]`) + projected-source resolution (ADR 013).                                                                                                                                                      |
| `preferences/`                      | Preferences electron-store service (ADR 004 split by mode, R-ELECTRON-4).                                                                                                                                                                  |

`preload/preload.ts` is the context-isolated bridge exposing `window.api` via `contextBridge`;
`ipc-invoke.util.ts` wraps `ipcRenderer.invoke`.

## Renderer — `apps/zmt/src/`

React + MUI, Chromium sandbox, `@contracts`-only cross-process surface (R-REACT-1).

| Path                                                                      | Responsibility                                                                                                                                                                                     |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared/entity-form/entity-form-shell.component.tsx`                      | The entity-agnostic form shell — renders blocks, wires RHF, tracks dirty, runs the Zod resolver, guards unsaved changes, dispatches `save` (ADR 018).                                              |
| `shared/entity-form/*-block.component.tsx`                                | One renderer per block kind: `property-bag`, `named-nested`, `list-of-scalars`, `object-list`, `keyed-object-map`; plus `scalar-rows`, `field-value-control`.                                      |
| `shared/entity-form/entity-form-registry.service.ts`                      | Host-side `entityFormRegistry` keyed by `(gameId, entityId)` (write side).                                                                                                                         |
| `shared/entity-form/entity-form-rhf.util.ts`, `field-spec-to-zod.util.ts` | Seed RHF values from blocks; generate a Zod schema from field specs.                                                                                                                               |
| `features/mod-content/`                                                   | Mod browsing — file tree (selection, expansion, double-click toggle), entity table + `EntityTableToolbar` (the realized action host, ADR 015), plain editor. `components/`, `hooks/`, `services/`. |
| `features/mod-info-edit/`                                                 | `descriptor.mod` editing — builds an `EntityFormModel` directly (host-built exemplar) and validates via the plugin-supplied Zod schema.                                                            |
| `features/app-settings/`                                                  | App settings — per-game feature toggles + plugin config.                                                                                                                                           |
| `plugins/`                                                                | Renderer-side plugin registry — registers each game's recognizers and descriptors.                                                                                                                 |
| `app/`                                                                    | `layout/`, `providers/` (theme, error boundary, modal, locale), `router/`, `shell/`.                                                                                                               |
| `i18n/`                                                                   | Locale config/provider/resources; `locales/{de,en,uk}/` host strings (R-REACT-3).                                                                                                                  |
| `shared/` (rest)                                                          | `modal/` (R-REACT-2), `locale-switcher/`, `hooks/`, `react/`, `types/` (A-PROJ-4).                                                                                                                 |

## Per-game slices — hoi4

Each editable entity repeats the same slice across the paired libraries. `module` is the clean,
complete exemplar (full read + write chain, no carve-out).

### Renderer slice — `libs/r-game-hoi4/src/<entity>/`

| File                                                                           | Responsibility                                                                                |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `<entity>-recognizer.ts`                                                       | `matches` (path/type predicate) + `load` (calls `*:list`, maps rows, builds toolbar actions). |
| `<entity>-form-descriptor.ts`                                                  | `project`s the typed entity into an `EntityFormModel` composed from block-palette blocks.     |
| `<entity>-entity-id.const.ts`                                                  | The shared entity-identifier constant (recognizer `id` === descriptor `entityId`).            |
| `<entity>-actions.ts`                                                          | Business actions for the toolbar (e.g. Edit) (ADR 015).                                       |
| `<entity>-delta.util.ts`                                                       | Diffs edited form values into the scoped `EntityBlockDelta` batch for `entity:write`.         |
| `known-<entity>-keys.const.ts`                                                 | Curated known-key sets + field specs (prop-bag suggestions, object-list/field templates).     |
| `<entity>-columns.const.ts`, `-row.util.ts`, `-sort.util.ts`, `-error.util.ts` | Table columns, row projection, sort comparator, error-message mapping.                        |

Registration hub: `hoi4-renderer-plugin.const.ts` lists the game's `recognizers`,
`formDescriptors`, `components`, and `localeResources`. `scalar-bag/` holds the shared
scalar-bag model + delta utils reused across slices; `locales/{en,de,uk}/plugin.hoi4.ts` are
the plugin's locale resources.

Slice variations (why `module` is the skeleton): `plane` (under `equipment/`) rides the shared
equipment read side with no recognizer of its own; `state` is rooted under `history/` and adds
per-province building keyed-object-maps; `character` adds an `enum` field and two-level portrait
nesting; `ideology` adds an editable keyed-object-map (`types` subideologies) with prop-bag
entries; `technology` adds object-lists and is intentionally thin (ADR 021).

### Main slice — `libs/e-game-hoi4/src/<entity>/`

| File                       | Responsibility                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------ |
| `extract-<entity>.util.ts` | Parses the file and builds the typed entity projection the `*:list` service returns. |

Root files: `hoi4-plugin.const.ts` (main-side plugin — schemas + parser dialects),
`mod-descriptor-schema.const.ts` (the `descriptor.mod` Zod schema). `equipment/` also holds
`build-archetype-index.util.ts`, `extract-slots.util.ts`, and `interface-category-domain.const.ts`
(ADR 017); `module/module-location.const.ts` defines where module files live.

## Decision records — `docs/adr/`

Per-decision ADRs + `ledger.md` (open/deferred decisions, `L-NNN` with closure triggers per
R-WORK-8) + `ADR-INDEX.md` (the complete index, including amendments). See the index for the
full list.
