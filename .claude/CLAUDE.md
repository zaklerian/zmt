# Working rules — index

Working rules split by audience:

- **`.claude/BASE.md`** — project-agnostic rules covering how we work together. Stance, foundation, input/output, pattern recognition, process, workflow. Read first.
- **`.claude/PROGRAMMING.md`** — rules covering how code is written. CODE, TS, ELECTRON, REACT, PROJ.
- **`.claude/PROMPTING.md`** — rules covering how CC-targeted prompts are generated.
- **`.claude/PREFERENCES.md`** — project-specific overrides by rule ID.

Order within each file is decision-tree priority: most upstream and load-bearing first, style and conventions last. CC reads top-down; reading order is part of the design.

Rule IDs are scoped per category. `R-WORK-N` in BASE; `R-CODE-N` / `R-TS-N` / `R-ELECTRON-N` / `R-REACT-N` / `R-PROJ-N` in PROGRAMMING; `R-PROMPT-N` in PROMPTING. The category prefix disambiguates; no global numbering across files.

Skills under `.claude/skills/` extend CC's behavior for specific recurring tasks. They load on-demand when their descriptions match the current task.

## Session contract (always-in-context critical minimum)

This block carries the non-inferable process rules — the ones no hook, no lint,
and no code example can enforce. The full rule corpus lives in BASE/PROGRAMMING/
PROMPTING/PREFERENCES and should be read at session start; this block is what must
hold even if that read does not happen.

**Workflow, every session, in order:**

1. `git checkout main && git pull`
2. `git checkout -b dev/ZMT-{id}` (or `hotfix/`). The branch-name hook enforces this.
3. Read the four `.claude/` rule files in full (BASE, PROGRAMMING, PROMPTING, PREFERENCES).
4. Execute the task delta from the prompt.
5. Commit: first line = ticket ID; body = symbol-prefixed (`+ - * ~ !`) per CONTRIBUTING.
6. `git push -u origin dev/ZMT-{id}`.
7. **Open the PR against main immediately after first push** — title `ZMT-{id} — {title}`,
   one ticket per PR (R-WORK-14). This is authorized standing per P-3: cloud sessions
   open PRs without asking; the per-task prompt IS the permission. Do NOT skip the PR,
   do NOT wait for session end, do NOT ask per-PR. The only exception is a prompt that
   explicitly says "no PR".
8. Update the tracking doc named in the prompt on merge.

**Proof of load:** in your first response, name (a) the active PREFERENCES overrides
and (b) the one rule carve-out relevant to this task. Cannot name one → context not
loaded → read the four files before proceeding.

**Branch authority (R-PROJ-1 over harness default):** The harness may pre-create
and check out a `claude/<slug>` branch and instruct "never push to a different
branch without permission." For this repo, R-PROJ-1 overrides that default: the
per-task prompt IS the authorization to work on `dev/ZMT-{id}`. If the session
starts on a `claude/*` branch, your FIRST action is `git checkout -b dev/ZMT-{id}`
(or `hotfix/`). The branch-name hook blocks commits/pushes on any non-conforming
branch — a stuck commit means you are still on the harness branch; create and
switch first. Do not ask per-branch; do not resolve the conflict in favor of the
harness. Surface it once (R-WORK-4) and proceed on dev/ZMT-{id}.

**Non-negotiable reasoning posture (not inferable from code):**

- Default to critique, not validation. Find where the architectural bets are wrong.
  If nothing is wrong, say so — do not pad with validation.
- Conflict with a prior rule/ADR/ledger decision → STOP and surface it by ID/date;
  do not act on the apparent reversal until acknowledged (R-WORK-4).
- Scope agreement to the item under discussion; adjacent decisions stay put (R-WORK-3).
- Number clarifying questions Q1/Q2… and keep numbering across the thread (R-WORK-6).

## Project map

> **This map is always in context (it lives in CLAUDE.md). Obey it.** It exists to kill two guesses on every run: (a) what a folder holds, (b) which exemplar to copy. Never assume a folder's purpose — it is in the coverage table below. Never pick a random feature to mirror — copy the **golden reference** named for the task.
>
> **UPDATE DISCIPLINE (R-WORK-15):** a PR that adds, moves, or repurposes a directory, or changes a golden reference, updates THIS section in the same PR. Same hygiene as ADRs.
>
> **Golden reference = the exact exemplar to COPY** (in spirit) for a pattern — the cleanest current instance, chosen so a copy inherits no flaw. `COPY x`, never `see x`. If a pattern has no clean exemplar it is marked `— no clean exemplar`.

**Why this format (required justification).** Two flat lookup tables — task-index first, folder-coverage second — because a table row is the least ambiguous unit for me to parse on a cold read: fixed columns, one row per lookup, no prose to reinterpret. The task index leads because "which exemplar do I copy" is the highest-frequency and highest-cost guess, so it must be reachable before anything else; folder coverage follows as the completeness backstop. Golden references are marked `COPY` (imperative), never `see` (optional), so the prescription is structurally impossible to read as a suggestion.

### Architecture in one line

Electron 3-context app + paired per-game libraries (ADR 010). Renderer (`apps/zmt`) ⇄ IPC ⇄ main (`apps/electron`), sharing types via `libs/contracts` only. Each game = `libs/e-game-{id}` (main: extract/validate) + `libs/r-game-{id}` (renderer: forms/tables). Read side = recognizer→list channel→extractor; write side = one atomic mutation service. Only game today: **hoi4**. Six entities repeat the same slice: **character, equipment, ideology, module, state, technology**.

### Task → location + golden reference (COPY, don't cite)

| Task | Go to | COPY (golden reference) |
| ---- | ----- | ----------------------- |
| **Add an editable entity (full slice)** | new domain folder in each paired lib | **COPY the whole `module` slice** — descriptor `libs/r-game-hoi4/src/module/module-form-descriptor.ts`, recognizer `…/module-recognizer.ts`, actions `…/module-actions.ts`, extractor `libs/e-game-hoi4/src/module/extract-modules.util.ts`, list service `apps/electron/src/main/module/list-module.service.ts`, handler `apps/electron/src/main/setup/module-handlers.setup.ts`, register in `libs/r-game-hoi4/src/hoi4-renderer-plugin.const.ts`. Skill: `add-entity-form-descriptor`. |
| **Add a form descriptor only** (entity already listed) | `libs/r-game-hoi4/src/<domain>/<x>-form-descriptor.ts` | `COPY module-form-descriptor.ts` (clean full descriptor). Riding an existing read-side: `COPY plane-form-descriptor.ts` (equipment carve-out). Skill: `add-entity-form-descriptor`. |
| **Add a reachability chain** (make an entity list in the table) | recognizer + `entity:list` channel + extractor + registration | `COPY libs/r-game-hoi4/src/module/module-recognizer.ts` + its chain (handler, `extract-modules.util.ts`, plugin const). |
| **Change a save / write** | `apps/electron/src/main/fs/entity-mutation.service.ts` | The **only** write path (ADR 019); extend in place — `— no clean exemplar to copy`, edit the service. |
| **Add a form block kind** | model `libs/r-core/src/entity-form/entity-form-block.model.ts` + renderer `apps/zmt/src/shared/entity-form/<x>-block.component.tsx` | `COPY apps/zmt/src/shared/entity-form/list-of-scalars-block.component.tsx` (cleanest block renderer). |
| **Add a cross-boundary type** | `libs/contracts/src/<domain>/` (sibling folder, never deeper) | Domain model: `COPY libs/contracts/src/module/module-entity.model.ts` (readonly per R-TS-4). Wire id: add to `libs/contracts/src/ipc/ipc-channel.const.ts`. |
| **Add an IPC channel** | four-file edit (channel + api + handler + preload) | `COPY apps/electron/src/main/fs/read-file.service.ts` + `…/setup/fs-handlers.setup.ts` + `apps/electron/src/preload/preload.ts`. Skill: `add-ipc-channel`. |
| **Add a plugin contribution** | `GamePlugin` (`@contracts`) if main needs it, else `RendererPlugin` (`libs/r-game-*`) | Cross-process: `COPY libs/contracts/src/plugin/parser-extension.model.ts`. Renderer-only: `COPY renderer-plugin.model.ts` `localeResources`. Skill: `add-plugin-contribution`. |
| **Parser / grammar change** | `libs/paradox-parser/src` — CST in `cst/`, AST in `ast/` | AST build `ast/cst-to-ast.util.ts`, emit `ast/serialize.util.ts`, dialect `ast/paradox-dialect.const.ts` + `ast/dialects-from-plugins.util.ts`. Guard: `COPY ast/round-trip.spec.ts`. |
| **Add a renderer feature** | `apps/zmt/src/features/<domain>/` | `COPY features/mod-info-edit/` (form + service + hook feature, ADR 018 host-built model). |
| **Add a main-side read/list service** | `apps/electron/src/main/<domain>/` | `COPY apps/electron/src/main/module/list-module.service.ts`. |
| **Record a decision** | deferred → `docs/adr/ledger.md` (`L-NNN` + closure trigger, R-WORK-8); landed → new `docs/adr/NNN-*.md` + row in `docs/ADR-INDEX.md` | `COPY` an existing ADR file for structure; `COPY` a ledger row for the deferred form. |
| **Add a locale key / namespace** | host `apps/zmt/src/i18n/locales/{en,de,uk}/`; plugin `libs/r-game-hoi4/src/locales/{en,de,uk}/` | EN first, then DE+UK (missing key = build error, R-REACT-3). Convention in `docs/CONTRIBUTING.md`. |

**Golden-reference caveats (why `module` is the entity exemplar).** `module` is the clean, complete slice: full read+write chain, no carve-out. The other five carry a facet to copy *only if you need it*, not the skeleton: `plane` rides the existing equipment read-side (no recognizer); `state` is `history/`-rooted not `common/`; `character` adds an `enum` field + two-level portrait nesting; `technology` adds object-lists; `mod-descriptor` uses an external Zod `schema()` instead of generated validation. Start from `module`; graft a facet from the slice that owns it.

### Folder coverage — every meaningful directory (one line each)

**`apps/electron/src/` — main + preload (Node.js side)**

| Dir | Purpose |
| --- | ------- |
| `main/` | Main-process root; `main.ts` = entry + startup sequence (`bootstrap()`). |
| `main/<entity>/` (character, equipment, ideology, module, state, technology) | Per-entity main-side **read** services (list + equipment source enumeration/resolution; module also `catalog`). |
| `main/factories/` | Constructors (e.g. `create-main-window.factory.ts`). |
| `main/fs/` | Filesystem services: read/write/list/search/classify, `path-guard.util.ts`, **`entity-mutation.service.ts`** (the write path), `equipment-slots.service.ts`. |
| `main/ipc/` | Wire infrastructure — `ipcHandle` helper. |
| `main/plugins/` | Main-side plugin registry + init + known-plugins list. |
| `main/preferences/` | Preferences electron-store service. |
| `main/resolution/` | Load-order resolution (ADR 016). |
| `main/setup/` | App wiring: per-namespace IPC handler registration, lifecycle, CSP, default-root seed. `__test-utils__/` = handler-spec helpers. |
| `main/state/`, `main/technology/`, … | (covered by per-entity row above). |
| `main/workspace/` | Persisted workspace store (`includedMods[]`, ADR 013) + projected sources. |
| `main/assets/` | Static main-process assets. |
| `preload/` | Context-isolated bridge — `preload.ts` (`window.api` via contextBridge), `ipc-invoke.util.ts`. |

**`apps/zmt/src/` — renderer (React + MUI, Chromium sandbox)**

| Dir | Purpose |
| --- | ------- |
| `app/layout/` | AppHeader/Footer/Layout, breadcrumbs, toolbar. |
| `app/providers/` | Theme + CssBaseline + ErrorBoundary + Modal + Locale providers. |
| `app/router/` | Route config. |
| `app/shell/` | AppShell, shell context, content panel, view-mode + edit-guard hooks. |
| `features/mod-content/` | Mod browsing — file tree, entity table, plain editor (components/hooks/services). |
| `features/mod-info-edit/` | `descriptor.mod` editing form (host-built EntityFormModel exemplar). |
| `features/app-settings/` | App settings — per-game feature toggles + plugin config. |
| `i18n/` | Locale config, provider, resources, plugin-namespace registration; `locales/{de,en,uk}/` host strings. |
| `plugins/` | Renderer-side plugin registry + descriptor/recognizer registration hooks. |
| `shared/entity-form/` | Entity-agnostic form **shell** + block renderers + host-side `entity-form-registry.service.ts`. |
| `shared/modal/` | Modal provider + hook + model (R-REACT-2). |
| `shared/locale-switcher/` | Locale switcher component. |
| `shared/hooks/` | Cross-feature hooks (collection bucket, A-PROJ-4). |
| `shared/react/` | React utilities — error boundary, `create-required-context`. |
| `shared/types/` | Global ambient type declarations. |
| `assets/` | Static renderer assets. |

**`libs/` — shared + paired-game libraries**

| Dir | Purpose |
| --- | ------- |
| `contracts/src/api/` | Shape of `window.api` (`AppApiModel`). |
| `contracts/src/ipc/` | Wire identifiers — channel consts, error model, sentinels, payload limits (R-ELECTRON-2). |
| `contracts/src/<domain>/` (character, entity, equipment, fs, ideology, module, plugin, preferences, state, technology, workspace) | Cross-process types per domain; `entity/` = write/delete contract (deltas, scopes); `plugin/` = `GamePlugin`/`FeatureContribution`/ids; `fs/` = fs-node + file-support consts. New contracts are sibling folders, never deeper. |
| `paradox-parser/src/cst/` | Concrete syntax tree — lexer/parser layer. |
| `paradox-parser/src/ast/` | AST model, `parse`, `cst-to-ast`, `serialize`, `visit`, dialect + `dialects-from-plugins`; `__fixtures__/` = parser test inputs. |
| `r-core/src/action/` | Business-action model (ADR 015). |
| `r-core/src/entity-form/` | Entity-agnostic form **contract** — block/form/field-spec models + `defineEntityFormDescriptor`. |
| `r-core/src/modal/` | Modal model (renderer-core). |
| `r-core/src/recognizer/` | `EntityTableRecognizer` model + registry service. |
| `e-game-hoi4/src/<entity>/` | Main-side **extractors** (`extract-*.util.ts`) per entity; root files = plugin const + mod-descriptor schema. |
| `r-game-hoi4/src/<entity>/` | Renderer per-entity slice: `*-form-descriptor`, `*-recognizer`, `*-actions`, `*-columns`, `*-row`, `*-sort`, `*-delta`, `*-error`, `known-*-keys`, `*-entity-id`. |
| `r-game-hoi4/src/locales/` | Plugin (`plugin.hoi4`) locale resources per locale. |
| `r-game-hoi4/src/scalar-bag/` | Shared scalar-bag model + delta utils reused across entity slices; root = renderer-plugin const/model + traits component. |

**`.claude/` and `docs/`**

| Dir | Purpose |
| --- | ------- |
| `.claude/*.md` | Working rules — BASE (process), PROGRAMMING (code), PROMPTING (CC prompts), PREFERENCES (overrides), CLAUDE.md (index + this map). |
| `.claude/hooks/` | Enforcement — session-start context pointer, branch-name check. |
| `.claude/skills/` | On-demand task skills: `add-entity-form-descriptor`, `add-ipc-channel`, `add-plugin-contribution`, `retro-format`. |
| `docs/` | Project docs — ARCHITECTURE, CONTRIBUTING, PROJECT, DEVELOPMENT, ROADMAP, FAQ. |
| `docs/adr/` | Architectural decision records + `ledger.md` (open/deferred decisions) + `ADR-INDEX.md`. |
